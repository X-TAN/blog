/**
 * gitalk plugin
 */
const gitalkConfig = {
    // remote
    clientID: '50e63856383f4a81af4e',
    clientSecret: 'd3263b6cb7532513169b78c73d72031392dac847',
    repo: 'blog',
    owner: 'X-TAN',
    admin: ['X-TAN'],
    distractionFreeMode: false
};

const gitalkPlugin = (hook, vm) => {
    hook.doneEach(function () {
        let label, domObj, main, divEle, gitalk;
        label = vm.route.path;
        domObj = Docsify.dom;
        main = domObj.getNode("#main");
        /**
         * render gitalk
         */
        if (vm.route.path.includes("zh-cn")) {
            gitalkConfig.language = "zh-CN";
        }
        Array.apply(null, document.querySelectorAll("div.gitalk-container")).forEach(function (ele) {
            ele.remove();
        });
        divEle = domObj.create("div");
        divEle.id = "gitalk-container-" + label;
        divEle.className = "gitalk-container";
        divEle.style = "width: " + main.clientWidth + "px; margin: 0 auto 20px;";
        domObj.appendTo(domObj.find(".content"), divEle);
        gitalk = new Gitalk(Object.assign(gitalkConfig, {id: !label || label === '/' ? "home" : label}));
        gitalk.render("gitalk-container-" + label);
    });
};
/**
 *  footer plugin
 */
const footerPlugin = (hook, vm) => {
    hook.beforeEach(function (html) {
        return html + '\n<br/><hr/>' +
            '<span class="footer" style="float: left;">更新时间：{docsify-updated}</span>';
    });
};
