var page = require('webpage').create();

// The base url to scrape data from
var BASEURL = "https://aderead6.univ-orleans.fr/jsp/standard/gui/tree.jsp?login=etuWeb&password=&projectId=2&category=";

// Interval between each branch fetching in ms
// The deeper the path, the longer it will take
var TIMEOUT = 3000;


// series of resource ID to fetch. (order no important)
// each id represent a branch to open.
var PATH = [
    3912,
    15957,
    17762,
    18015
];


// Categories are the branches' root
// choose one depending on what you want to scrape.
var CATEGORY = {
    TRAINER : "instructor",
    TRAINEE : "trainee",
    ROOM : "room",
    COURSE : "category6",
    GROUPE : "category7" // probably useless
}

// if the loaded page logs messages we pipe them to the phantomJS console
page.onConsoleMessage = function(msg) {
    console.log(msg);
};

// PhantomJS loads URL
page.open(BASEURL+CATEGORY.TRAINEE, function(status) {

    build();

    function build(start, end, callback){

        if(typeof start === 'undefined')
            start = 0;
        if(typeof end === 'undefined')
            end = 0;

        // Phantom inject this function in page context.
        // data can not go through page context and phantom script context
        // except for passed arguments and return value. (and console logs)
        var subTree = page.evaluate(function(start, end){

            var subTreeInside = []

            // extract the resource (XXXX) number
            // from a string like "javascript:checkBranch(XXXX, bool)"
            extractResourceNumber = function(str){
                return parseInt(str.substring(str.indexOf('(')+1, str.indexOf(',')));
            };

            // we list all the branches and items on the page
            var branchList = document.querySelectorAll('.treeline .treebranch a, .treeline .treeitem a');

            end = branchList.length -end;
            // console.log("Scrapping from "+start+" to "+(end -1)+" of "+(branchList.length -1));

            // we loop thought the banches and item only to save thoses which
            // are not already saved
            // we play on index (start and end variables) to do this
            for(var i=start; i<end; i++)
                subTreeInside.push({
                    label: branchList[i].innerText,
                    resource: extractResourceNumber(branchList[i].getAttribute('href'))
                });

            return subTreeInside;

        }, start, end);

        // display the tree findings (new data only)
        debugTree(subTree);

        // used to exit phantom when job is done
        if(callback)
            callback();

        // if the returned tree has a branch we want to fetch deeper we
        // open it and fetch it recursively
        for(var i=0; i<subTree.length; i++)
            for(var j=0; j<PATH.length; j++)
                if(subTree[i].resource == PATH[j])
                    spawnSub(subTree[i].resource, i+start+1, subTree.length -(i+1-end));
    }

    function spawnSub(resource, start, end){
        // open the given branch (by resource ID)
        // done on separated page context
        page.evaluate(function(resource){
            console.log("opening branch: "+resource);
            openBranch(resource);
        }, resource);
        // we timeout the fecthing of the newly opned branch to let phantomJS
        // the time to get data from ADE server.
        setTimeout(function(){
            build(start, end);
        }, TIMEOUT);
    }

});

function debugTree(tree){
    for(var i=0; i<tree.length; i++){
        console.log("["+tree[i].resource+"]  "+tree[i].label+" ("+i+")");
    }
}
