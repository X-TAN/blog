#### 缓存

##### 如何使用缓存

缓存，在软件系统中主要是为了提升高并发的处理能力。也就是说把一些高频数据存放到一个可以公开使用的地方，保证数据的性能，避免频繁拉库引起的数据响应相关问题，同时降低db的压力。

在我们的开放平台中，音频通道缓存的演进：

- 第一版：无缓存，在百度、微软、谷歌、科大讯飞、奇智、小牛等平台找到对应语言的支持，然后随机选择一个。耗时：200ms左右（mysql存放在同一个服务器，然后还涉及到多表操作，虽然表调整了，但是还是不能提升速度）
- 第二版：redis缓存，根据语言选择支持的通道，再根据语言的优先级找到对应通道，否则根据通道的并发量选出最高使用，满足并发量（滑动窗口计数）再选择下一个。耗时：28ms左右
- 第三版：**LoadingCache+redis多级缓存**，基本规则和上面一样，主要是在本机有缓存的时候提升通道获取速度。缓存一致性解决办法：MQ同步消息+通道获取服务链路固定（目前单个链接并发极限在broker，请求数量：80✖️60✖️100 = 48w）。耗时：1ms内

#### 为什么使用多级缓存

首先说一下为什么使用缓存：增量很少的数据，且是频繁读取的数据，而且在我们这里还需要最快速度响应，所以我们的缓存要求是越来越快。为什么使用内存缓存？要求速度快，对业务没有阻塞效果。

所以在我们的系统中，缓存主要是：提高性能、降低db压力，满足高性能和高并发的特点。

#### 缓存和数据库数据操作后，数据不一致问题？

我们常见的缓存和数据库数据变更的同步方案有：

- 先删缓存，再更新数据库
- 先更新数据库，再删缓存
- 缓存延时双删，更新前先删除缓存，然后更新数据，再延时删除缓存
- 监听MySQL binlog进行缓存更新

> 先删缓存，再更新数据库

这种方案的漏洞很明显：

```shell
-> A 清理缓存，准备刷DB
-> B 获取数据，无缓存，拉到DB数据
-> A 刷写DB数据完毕，同步缓存（或被其他程序获得新数据）
```

在这个方案中，我们明显的可以看到这个 B 获取到了旧的数据，和新的数据不一致。这种情况下面，如何保证数据一致呢？使用分布式锁，在变更数据之前加锁，然后获取数据的时候，检测到锁存在，则返回空数据，或者延迟等待一下新数据的存在。

> 先更新数据库，再删缓存

首先需要提到的一点就是，DB的写操作代价比读高，越是数据多成本越明显。这时候，当缓存失效的时候，突然去变更DB数据

```shell
-> A 进入数据库获取到旧值
-> B 进入数据库修改数据成功并变更缓存
-> A 使用旧值更新了缓存

```

如果产生这种情况，要保证的唯一就是缓存刷写在生效后做一次校验，或者说是延迟刷新缓存。当然在数据库主从同步的情况下，延迟刷新数据也是个不错的方案。

> 缓存延时双删，更新前先删除缓存，然后更新数据，再延时删除缓存

这种基本等同于更新数据库后，再刷新数据。

> 异步更新缓存（基于订阅binlog的同步机制）

MySQL数据库操作后，只要开启了日志记录，我们都可以通过binlog查看执行的具体操作，可以追述到具体的数据库服务器时钟时间。在这种情况下，我们可以利用这个binlog完成数据库主从同步，也可以实现订阅binLog数据更新到redis。

实现思路（理解成读写分离和主从的结合）：

- 读取redis，热数据都存放到redis。过期的老旧的历史数据啥的，还是存放到mysql避免redis数据臃肿、保障性能。
- 写MySQL：数据变更操作都是变更MySQL。
- 更新redis数据：订阅MySQL的binlog变更，并把数据内容刷写到redis。

##### 缓存雪崩、缓存穿透、缓存击穿、缓存并发竞争

先简单说一下缓存的工作过程，缓存就是把一些特殊需要的数据存放到一个可以私有化标准操作的地方，用来提升系统性能，降低落地DB的压力。

> 缓存穿透：

缓存穿透是指  访问端构造了一堆大量不存在的数据来查询，导致大量的实际请求落到了DB上面，导致数据库压力过大。

解决办法：

- 常见为空的数据提前做好备份缓存，防止数据落到db，避免系统中使用自增ID相关的数据查询关键字，多次未查询到的数据做缓存处理
- 在开发的业务代码层面做好数据拦截，常见的字符串查询关键字为空拦截，ID为负数的检查等等。

> 缓存击穿

这种场景是**数据库中存在该数据，但是缓存中可能没有**的情况下，大量数据的请求瞬间落到DB上面，这种情况解决办法如下：

- 热点数据合理配置过期时间，或者是永不过期（永不过期的数据，一定要严格合理的使用redis数据结构）。
- 缓存处理这一块合理加锁，先检查缓存是否存在 -> 不存在数据 -> **加锁（[一致性hash算法](https://gist.github.com/linux-china/7817485)）** -> 获取DB数据，并且刷新缓存 -> 释放锁
    - 在上面没有获取到锁的时候，可以根据业务需要快速失败
    - 也可以尝试等待锁，在进入后再次检查缓存数据是否存在
    - 还可以休眠线程一定时间再获取数据，当然具体情况根据实际需要求变化

> 缓存雪崩

这个是说缓存中的数据大规模的过期或者其他原因找不到了，而且超大规模的数据直接落地到DB，导致数据库卡顿或者是数据库宕机。和击穿不同的是，击穿是某条或者某几条，而这个是大批量的缓存失效，导致很多数据查询落地到DB。

解决办法：

- 缓存数据防止同时过期，随机分配过期时间，防止产生同时大规模的数据同步离线。
- 在条件允许的情况下将缓存数据分布式部署。
- 高必用的热点数据直接DB上面永不过期。

> 缓存并发竞争

这种场景主要是因为多端同时设置同一个key导致的竞争关系。这种场景主要的解决方案就是将并发转换为非并发关系：

- 分布式锁，根据时间排序
    - 根据lua脚本实现获取锁，并且将锁存放于set中，按照时间排序
    - 客户端获取到对应的时间锁，检查是否小于其他的时间，小于其他的时间则跳过。
- 使用消息队列解耦，消息队列的特殊性质决定了，只能先进先出一个个的执行，再结合业务代码降低key并发竞争。

#### Redis 和 Memcached 有什么区别？Redis 的线程模型是什么？为什么 Redis 单线程却能支撑高并发？

这个几个问题总结起来，一般我的回答都是我没有深入了解Memcached，但是**redis在以前的版本中都是单线程操作的模型（避免高速读写带来的多线程切换或者是线程竞争问题），所有的数据均在内存中，内存执行速度非常快，链接特性是非阻塞的IO多路复用，C实现接近操作系统（举例说Java的服务器假如可以链接100个客户端，C++可以连接200个，C可能更强）**。接着讲解为什么使用redis。

- 首先redis支持多种数据结构
    - string，常见的k-v结构，比如说用户登录信息自动过期，超过7天就需要重新登录。
        - string本身类似Java的ArrayList，通过预先分配内存空间提升性能，避免频繁的读写产生大量的内存分配。没有超过1M每次扩容增加一倍，超过2M后每次都是最多扩容1M，最大存放512M。
        - 支持过期删除
    - list，**redis的列表数据采用的是双向链表（不是数组）**，首尾插入性能较强。内容过大，需要关注操作的时间复杂度。
        - 队列／堆栈 链表可以从表头和表尾追加和移除元素，结合使用rpush/rpop/lpush/lpop四条指令，可以将链表作为队列或堆栈使用，左向右向进行都可以。
    - hash，类似HashMap，基本原理跟Java的hashmap类似，数组+链表，通过对key的hash实现对数组的定位，然后通过对链表遍历实现查找k-v。
        - 当redis的hash碰撞频繁的时候，redis会进行hash的扩容，创建原来hash的两倍空间来存放，采用渐进式rehash，保留两个新旧的hash的内存结构，实现旧hash元素逐渐迁移到新的hash，避免数据过大的单线程操作卡顿问题（这里的扩容方案类似golang的hashmap）。
    - set，类似Java的hashset，内部实现跟hash类似，不过所有的value指向同一个元素。
    - sortedset，又叫做zset，既是排序的set，给每个value赋值权重，内部元素按照权重排序。
        - zset底层实现使用了两个数据结构，第一个是hash，第二个是跳跃列表，hash的作用就是关联元素value和权重score，保障元素value的唯一性，可以通过元素value找到相应的score值。跳跃列表的目的在于给元素value排序，根据score的范围获取元素列表。

- redis支持集群模式，能快速扩容或者缩容。扩容是添加node到集群，然后分配槽位，缩容相反。

Redis 6.0 开始引入多线程 注意！ Redis 6.0 之后的版本抛弃了单线程模型这一设计，原本使用单线程运行的Redis 也开始选择性地使用多线程模型。前面还在强调 Redis 单线程模型的高效性，现在为什么又要引入多线程？这其实说明 Redis 在有些方面，单线程已经不具有优势了。因为读写网络的 Read/Write 系统调用在 Redis 执行期间占用了大部分 CPU 时间，如果把网络读写做成多线程的方式对性能会有很大提升。Redis 的多线程部分只是用来处理网络数据的读写和协议解析，执行命令仍然是单线程。之所以这么设计是不想 Redis 因为多线程而变得复杂，需要去控制 key、lua、事务、LPUSH/LPOP 等等的并发问题。总结一下：**redis内存中的数据操作还是单线程模型，但是多线程主要用作处理网络链接和协议解析上。这样既在单核模式下高速工作，又避免了多线程操作导致的线程不安全相关问题。**

##### redis高可用

高可用，简单讲一下就是在各种通用场景下都可以正常使用。而最大的问题就是任何设备的资源都是有限的，如何将有限的资源最大化的合理使用，并且提供稳定的服务体验，这个就是高可用。

单机redis，常规吞吐量是几万的QPS，多个读写实例集群能提供几十万的QPS。跟我们Java的微服务一样，**单机能提供的qps是有限的，如何将有限的资源整合起来提供能够应对一定突发量，满足当下发展，以及一定可预估的使用，这就是良好的程序员应该做的事。**应用程序的压力是一定的，如何使用合理的方式适当的分配压力，保证程序稳健才是我们应该做的事。

> redis主从

redis的主从，可以理解成，**一主多从和读写分离**。这种模式下的高可用主要是保证redis集群中能快速可用的提供读写服务，如果master掉线，这种情况下如何快速的整一个master出来对外提供服务，这个才是最重要的，也就是我们的**哨兵机制**。

redis主从复制的要点：

- 异步复制数据（收到数据后，本地写入，再异步发送出去），保证不会阻塞主线程的操作。
- 周期性确定每次复制的数据量。
- 一个master可以配置多个slave节点
- salve之间可以互相连接
- salve在进行复制的时候不会阻塞或锁定master
- salve在复制的时候，也不会阻塞或者是锁定自身，依然会提供对外的服务
- salve复制完成后，删除旧的数据，加载新的数据，会暂停服务
- salve主要用于扩容读的容量
- 必须开启master的持久化
- 支持断点续传，如果在复制过程中网络断开，可以在连接恢复后续传。
- 支持无磁盘化的复制，内存足够的情况下，内存操作更快
- 从节点salve不会处理过期key，只有master过期，然后会发送一条del给从节点。
- 支持全量复制和增量复制，新加入从节点没有数据的时候触发全量复制，全量复制过程中salve链接失败触发增量复制。

> redis哨兵

**主要功能如下**：

- 集群监控：负责监控 Redis master 和 slave 进程是否正常工作。
- 消息通知：如果某个 Redis 实例有故障，那么哨兵负责发送消息作为报警通知给管理员。
- 故障转移：如果 master node 挂掉了，会自动转移到 slave node 上。
- 配置中心：如果故障转移发生了，通知 client 客户端新的 master 地址。

redis哨兵本身也是分布式的，跟主从协同工作。依靠选举机制，大部分哨兵同意主节点离线才可以从新选举master节点。

**选举核心算法**如下：

- 如果一个 slave 跟 master 断开连接的时间已经超过了 down-after-milliseconds 的 10 倍，外加 master 宕机的时长，那么 slave 就被认为不适合选举为 master。
- 按照 slave 优先级进行排序，slave priority 越低，优先级就越高。
- 如果 slave priority 相同，那么看 replica owset，哪个 slave 复制了越多的数据，owset 越靠后，优先级就越高。
- 如果上面两个条件都相同，那么选择一个 run id 比较小的那个 slave。
- 选举master后，将master配置信息通过pub/sub消息机制发送出去，并将本次的版本号发送，其他哨兵通过版本号决定master配置。

在这里提一下我们的本地会议宝（**Android嵌入服务器**）的自动选举算法：
- 通过udp发送局域网广播信息，通知本身是选举状态，包含本身的IP和选举当前次数
- 选举次数为关键信息，次数高的淘汰低次数的
- 选举次数相同，以IP尾数大的为准
- 选举流程结束后，发送一次广播认为自身是选举次数最大的再处理一次逐出结果
- 最终主节点发送全局广播确认。
- 新加入的节点问询是否有leader，没有leader参与选举，否则变成服务节点。
- 局域网内，1s发送heartbeat(pingpong消息)检测，超时3s，重新选举实现上面的流程。

**Redis哨兵主备切换的数据丢失问题**

- 异步复制过程中数据丢失，当master数据还未完全同步到salve上，master宕机，这时候这部分数据丢失
- 脑裂导致数据丢失，masterA设备断网，超时后，集群选举出新的masterB。这时候masterA恢复网络，redis客户端还在给masterA写入数据，这时候集群将masterA切换为salve，masterA清理数据并复制masterB的数据。但是前面写入masterA的部分数据丢失了。

解决办法：降低数据复制和同步的时延，超过这个时间master不再接收数据。脑裂发生后，检查salve客户端连接，超过半数连接不能继续进行数据操作，拒绝redis客户端请求，那么数据丢失量能控制在合理的范围。


#### Redis 集群模式的工作原理能说一下么？在集群模式下，Redis 的 key 是如何寻址的？分布式寻址都有哪些算法？了解一致性 hash 算法吗？

首先redis集群，可以做到多机上面多redis实例，每个实例存放一部分数据，同时每个redis主实例可以挂载redis从实例，当主掉线，自动切换到从。这个工作模式就是Redis cluster，针对海量数据+高并发+高可用的场景。Redis cluster 支撑 N 个 Redis master node，每个 master node 都可以挂载多个 slave node。

特点：

- 自动数据分片，每个master都存放一部分数据
- 内置高可用，部分master宕机还能继续工作
- 多端口，6379进行数据交换。16379用来进行故障检测、配置更新、故障转移授权等等，也就是 cluster bus通信。
    - cluster bus使用的数据通信协议为： gossip。俗称：病毒感染算法、谣言传播算法。
    - 所有节点都持有一份元数据，不同的节点如果出现了元数据的变更，就不断将元数据发送给其它的节点，让其它节点也进行元数据的变更。
    - gossip 协议包含多种消息，包含 ping , pong , meet , fail
        - meet：某个节点发送 meet 给新加入的节点，让新节点加入集群中，然后新节点就会开始与其它节点进行通信。
        - ping：每个节点都会频繁给其它节点发送 ping，其中包含自己的状态还有自己维护的集群元数据，互相通过 ping 交换元数据。每次都是找一些和自己最久没通信过的进行ping。
        - pong：返回 ping 和 meeet，包含自己的状态和其它信息，也用于信息广播和更新。
        - fail：某个节点A判断另一个节点B 宕机(fail) 之后，就发送 fail 给其它节点，说 节点B宕机了，然后其他节点可能会验证一下，确实宕机就会继续传播。

> 如何寻址？

寻址这个问题，其实最常见的就是Java中的hashmap，hashmap在增删改查的时候都会进行数据寻址，简单来说就是如何在hashmap中找到某个元素。

也就是给定一个key，如何提取一些关键信息，然后找到一定的特征，满足数据空间定位。简单的看一下Java8中hashmap数据特征的hash算法：
```java
    //扰动函数
    static final int hash(Object key) {
        int h;
        /**
        * 获取key的hashcode A，根据A再无符号右移16位获得B（B是A的高位数据放到了低位），再进行 异或 操作 二进制 同位相同 为0 同位不同为1
        **/
        return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
    }
    //桶定位
    int hash = (n - 1) & hash(key)
    //& 按位与  同位均为1为1，其他为0
    //任何2的整数幂，减一得到的二进制位全部是一。如：16-1=15，二进制表示为：1111；32-1=31，二进制表示为：11111。所以让Hash值与（&）上n-1后得到的就是低位Hash值，更加均匀的分布在 n-1 内
```

然后这个函数在相同的jvm虚拟机上，计算的结果是稳定相同的，则说明具有稳定性。加入我们的redis采用的这种算法来实现在集群中定位master位置，那么在某个master挂掉后，我们那个位置的所有数据均不可用。

**一致性hash算法**

简单的概括一下，这是个由redis集群设备组成的hash圆环，按照空间的顺时针方向排列，将主机的关键信息（host或者IP）进行hash。就像钟表一样，无论怎么走都在这个圆内。基本流程如下：

- 提交一个key，计算出hash值A
- 定位A在环中的位置，顺时针找到下一个master
- 当某个主节点离线，该节点数据暂不可用，其他不受影响。
- 从节点开始选举，找到数据最接近的为master（数据offset偏移量越大越接近），当然还有从节点跟主节点的超时时间，超过 cluster-node-timeout * cluster-slave-validity-factor 无法成为主节点。
- 节点宕机原理就是在节点超时时间内，某个节点一直没有返回超时时间，如果超过半数节点都认为节点A掉线，那么A就被认定为掉线（gossip协议）

#### LoadingCache分析

https://blog.csdn.net/QAQFyl/article/details/113619848?utm_medium=distribute.pc_relevant.none-task-blog-baidujs_baidulandingword-0&spm=1001.2101.3001.4242


