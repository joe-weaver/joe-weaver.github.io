$('document').ready(main);

const HR = '<hr>';
const BR = '<br>';

// The documentation data we need to load
window.docData = null;
window.initialLoadComplete = false;

// The main function of the application. Handles the initial load
function main() {
    console.log("Loading Data");

    // Page loaded, fetch data
    fetch("Docs/docs.json").then(parseJSON).then(data => finishDocLoad(data, () => {
        fetch("Docs/classes.json").then(parseJSON).then(data => finishDiagamsLoad(data, loadPage));
    }));
}

// The promise callback for when loading completes
function parseJSON(data){
    // Text data loaded from file, parse as json
    return data.json();
}

// The promise callback for when parsing JSON completes
function finishDocLoad(data, loadComplete){
    console.log("Doc Data Loaded");

    // Data is loaded, so set global data state
    window.docData = data;
    window.router.initializeInternalLinks(data);

    // Set loading state
    initialLoadComplete = true;

    // Defer to callback
    loadComplete();
}

function finishDiagamsLoad(data, loadComplete){
    console.log("Class Data Loaded");

    // Data is loaded, so set global data state
    window.classData = data;

    // Set loading state
    initialLoadComplete = true;

    // Defer to callback
    loadComplete();
}

// The callback that handles construction of the page HTML
function loadPage(){
    console.log("Loading complete - Constructing page");

    // Load is complete, so build page using the current route
    setPage();
}

/* ########## ROUTING ########## */
// Change the current page
const setPage = () => {
    let hash = window.location.hash;
    if (hash.length == 0) {
        hash = "#";
    }

    // If we changed pages
    if(hash !== router.currentPage){
        // Reload the content if loading is done.
        if(initialLoadComplete){
            window.router.navigate(hash);
        }
    }
}

// Handle page change routing
window.addEventListener("hashchange", setPage);

// Handle page load routing
window.addEventListener("DOMContentLoaded", setPage);

class Router {
    registeredRoutes = {
        "#": loadHomeRoute,
        "#docs": loadDocumentationRoute,
        "#diagrams": loadDiagramsRoute,
        "#guides": loadGuidesRoute,
        "#demos": loadDemosRoute,
        "#resources": loadResourcesRoute,
    };

    internalLinks = {}

    currentPage = "";

    initializeInternalLinks(data, path){
        if(path === undefined){
            path = "#docs/";
        }

        for(let docItem of data){
            this._initializeLinks(docItem, path);
        }

        console.log(this.internalLinks);
    }

    _initializeLinks(docItem, path){
        if(docItem.type === "file"){
            this.internalLinks[docItem.name] = path + docItem.name;
        } else {
            // Recursively create links in folders
            for(let subItem of docItem.data){
                this._initializeLinks(subItem, path + docItem.name + "/");
            }
        }
    }

    link(name){
        if(this.internalLinks[name]){
            return this.internalLinks[name];
        } else {
            return "#docs/";
        }
    }

    navigate(page){
        // Get the route and the path at said route
        let route = page.split("/")[0];
        let path = page.split("/").slice(1);

        // Get the registered route
        const reaction = this.registeredRoutes[route];

        // If such a route is registered, load the route
        if(reaction){
            console.log("Routing to " + route + " - Path: " + path);
            
            // Route
            const currentRoute = this.currentPage.split("/")[0];
            reaction(route !== currentRoute, path);

            // Set the current page
            this.currentPage = page;
        }
    }
}

window.router = new Router();
/* ############################## */

/* ########## ROUTES ########## */
function loadHomeRoute(routeChanged, docPage){
    // Get the sidebar
    const sidebar = $("#sidebar");

    // Build the sidebar
    sidebar.empty();

    const content = $("#content");

    content.empty();

    content.load("home/index.html");
}

function loadDocumentationRoute(routeChanged, docPage){
    console.log("Loading documentation route");

    // If we just entered this route, change the sidebar.
    if(routeChanged){
        // Get the sidebar
        const sidebar = $("#sidebar");

        // Build the sidebar
        sidebar.empty();
        
        for(let docItem of window.docData){
            constructSidebarItem(docItem, "docs/", sidebar);
        }
        
        $(".folder .folder-name").click(function(event){
            $(this).parent().toggleClass("closed");
        });
    }

    // Render the data for the current page of the docs    
    let pageData = {data: window.docData};
    let index = 0;

    while(index < docPage.length){
        for(let entry of pageData.data){
            if(entry.name === docPage[index]){
                pageData = entry;
            }
        }

        index++;
    }

    if(docPage.length === 0){
        $("#content").html("Welcome to docs!");
    } else if(pageData.data === window.docData || pageData.type === "folder"){
        // Render a 404, there is no doc
        $("#content").html("No page exists");
    } else {
        // Grab the content div and clear it
        const content = $("#content");
        content.empty();

        const docContent = $(`<div id="docs"></div>`)

        // Populate the content with the new page data
        constructDocContent(docContent, pageData.data);

        content.append(docContent);
    }
    
}

function constructSidebarItem(docItem, path, element){
    if(docItem.type === "file"){
        // Create a new file
        let file = makeFile(docItem.name, path);
        
        // Append it to the parent element
        element.append(file);
    } else {
        // Create a new folder
        let folder = makeFolder(docItem.name);

        // Recursively create items within this folder
        for(let subItem of docItem.data){
            constructSidebarItem(subItem, path + docItem.name + "/", folder);
        }

        // Append it to the parent element
        element.append(folder);
    }
}

function constructDocContent(parent, data){
    parent.append(makeTitle(data.name));

    parent.append(makeRelations(data.parent, data.implements));

    parent.append(makeDescription(data.description));

    parent.append(`<h2>Members</h2>`);
    parent.append(HR);
    parent.append(makeMembers(data.members));

    parent.append(`<h2>Functions</h2>`);
    parent.append(HR);
    parent.append(makeFunctions(data.functions));
    
}

/* ########## */
function loadDiagramsRoute(routeChanged, docPage){
    console.log("Loading diagrams route");

    // If we just entered this route, change the sidebar.
    if(routeChanged){
        // Get the sidebar
        const sidebar = $("#sidebar");

        // Build the sidebar
        sidebar.empty();

        for(let cd of window.classData){
            // Create a new file
            let file = makeFile(cd.sidebar, "diagrams/", cd.name);
        
            // Append it to the parent element
            sidebar.append(file);
        }
    }

    if(docPage.length === 0){
        $("#content").html("Welcome to diagrams");
    } else {
        // Grab the content div and clear it
        const content = $("#content");
        content.empty();

        let classDiagram = null;

        for(let diagram of window.classData){
            if(diagram.sidebar === docPage[0]){
                classDiagram = diagram;
            }
        }
        
        if(classDiagram !== null){
            let data = classDiagram.data;
            let width = classDiagram.size[0];
            let height = classDiagram.size[1];
            
            constructClassDiagram(content, data, width, height);
        } else {
            content.html("No page exists");
        }
        
    }
}

function constructClassDiagram(content, objs, width, height){

    const classContainer = $(`<div id="class-container"><canvas id="class-canvas"></canvas></div>`);
    classContainer.css("width",  width + "px");
    classContainer.css("height", height + "px");

    // Create and append the UML objects
    for(let obj of objs){
        let umlObj = null;

        if(obj.type === "note"){
            umlObj = makeUMLNote(obj.name, obj.content, {width: obj.width + "px", left: obj.position[0] + "px", top: obj.position[1] + "px"})
        } else if(obj.type === "box"){
            umlObj = makeUMLBox(obj.name, {width: obj.width + "px", height: obj.height + "px", left: obj.position[0] + "px", top: obj.position[1] + "px"})
        } else {
            umlObj = makeUMLItem(getData(obj.name), obj, obj.linkTo, {width: obj.width + "px", left: obj.position[0] + "px", top: obj.position[1] + "px"});
        }

        console.log(umlObj);

        classContainer.append(umlObj);
    }

    // Append to the page
    content.append(classContainer);

    // Now that they are appended, get the heights of the object and add any connections
    let connections = [];

    for(let obj of objs){
        obj.height = $('#' + obj.name).height();

        // Add any connections we need to render
        if(obj.extends !== null){
            connections.push({
                start: obj.name,
                end: obj.extends.name,
                startFactor: obj.extends.startFactor,
                endFactor: obj.extends.endFactor,
                startFace: obj.extends.startFace,
                endFace: obj.extends.endFace,
                type: "parent"
            });
        }

        for(let con of obj.implements){
            connections.push({
                start: obj.name,
                end: con.name,
                startFactor: con.startFactor,
                endFactor: con.endFactor,
                startFace: con.startFace,
                endFace: con.endFace,
                type: "interface"
            });
        }

        if(obj.lines){
            for(let con of obj.lines){
                connections.push({
                    start: obj.name,
                    end: con.name,
                    startFactor: con.startFactor,
                    endFactor: con.endFactor,
                    startFace: con.startFace,
                    endFace: con.endFace,
                    type: "line",
                    dotted: con.dotted,
                    annotationSide: con.annotationSide,
                    startAnnotation: con.startAnnotation,
                    endAnnotation: con.endAnnotation
                });
            }
        }

        if(obj.composition){
            for(let con of obj.composition){
                let startName = con.name;
                let endName = obj.name;
                if(con.reversed){
                    startName = obj.name;
                    endName = con.name;
                }

                connections.push({
                    start: startName,
                    end: endName,
                    startFactor: con.startFactor,
                    endFactor: con.endFactor,
                    startFace: con.startFace,
                    endFace: con.endFace,
                    type: "has",
                    annotationSide: con.annotationSide,
                    startAnnotation: con.startAnnotation,
                    endAnnotation: con.endAnnotation
                });
            }
        }

        if(obj.related){
            for(let con of obj.related){
                connections.push({
                    start: obj.name,
                    end: con.name,
                    startFactor: con.startFactor,
                    endFactor: con.endFactor,
                    startFace: con.startFace,
                    endFace: con.endFace,
                    type: "other",
                    annotationSide: con.annotationSide,
                    startAnnotation: con.startAnnotation,
                    endAnnotation: con.endAnnotation
                });
            }
        }
    }

    const canvas = document.getElementById("class-canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    $('#class-canvas').mousemove((e) => {
        var mouseX, mouseY;

        if(e.offsetX) {
            mouseX = e.offsetX;
            mouseY = e.offsetY;
        } else if(e.layerX) {
            mouseX = e.layerX;
            mouseY = e.layerY;
        }

        ctx.clearRect(0, 0, 200, 30);
        ctx.fillText("(" + mouseX + ", " + mouseY + ")", 0, 20);
        
    });

    // Draw all of the arrows
    ctx.strokeStyle = "#000000";
    ctx.strokeWidth = 5;

    for(let con of connections){
        let start, end;

        for(let obj of objs){
            if(obj.name === con.start){
                start = [obj.position[0], obj.position[1]];

                if(con.startFace === "top"){
                    if(con.startFactor <= 1){
                        start[0] += obj.width * con.startFactor;
                    } else {
                        start[0] += con.startFactor;
                    }
                } else if(con.startFace === "bottom"){
                    if(con.startFactor <= 1){
                        start[0] += obj.width * con.startFactor;
                    } else {
                        start[0] += con.startFactor;
                    }
                    start[1] += obj.height;
                } else if(con.startFace === "left"){
                    if(con.startFactor <= 1){
                        start[1] += obj.height * con.startFactor;
                    } else {
                        start[1] += con.startFactor;
                    }
                } else {    // Right
                    start[0] += obj.width;
                    if(con.startFactor <= 1){
                        start[1] += obj.height * con.startFactor;
                    } else {
                        start[1] += con.startFactor;
                    }
                }
            }

            if(obj.name === con.end){
                end = [obj.position[0], obj.position[1]];
                if(con.endFace === "top"){
                    if(con.endFactor <= 1){
                        end[0] += obj.width * con.endFactor;
                    } else {
                        end[0] += con.endFactor;
                    }
                } else if(con.endFace === "bottom"){
                    if(con.endFactor <= 1){
                        end[0] += obj.width * con.endFactor;
                    } else {
                        end[0] += con.endFactor;
                    }
                    end[1] += obj.height;
                } else if(con.endFace === "left"){
                    if(con.endFactor <= 1){
                        end[1] += obj.height * con.endFactor;
                    } else {
                    end[1] += con.endFactor;
                    }
                } else {    // Right
                    end[0] += obj.width;
                    if(con.endFactor <= 1){
                        end[1] += obj.height * con.endFactor;
                    } else {
                        end[1] += con.endFactor;
                    }
                }
            }
        }

        let [ar1, ar2] = getArrowDirections([end[0] - start[0], end[1] - start[1]]);
        let [sa, saRight] = getArrowDirections([start[0] - end[0], start[1] - end[1]]);
        
        if(con.annotationSide === "right"){
            startAn = [start[0] + saRight[0] * 30, start[1] + saRight[1] * 30];
            endAn = [end[0] + ar1[0] * 30, end[1] + ar1[1] * 30];
        } else {
            startAn = [start[0] + sa[0] * 30, start[1] + sa[1] * 30];
            endAn = [end[0] + ar2[0] * 30, end[1] + ar2[1] * 30];
        }

        let mag = Math.sqrt((start[0] - end[0])*(start[0] - end[0]) + (start[1] - end[1])*(start[1] - end[1]));

        let arrowSize = con.type === "other" || con.type === "has" ? 10 : 15;

        ar1[0] = end[0] + ar1[0] * arrowSize;
        ar1[1] = end[1] + ar1[1] * arrowSize;
        ar2[0] = end[0] + ar2[0] * arrowSize;
        ar2[1] = end[1] + ar2[1] * arrowSize;

        ctx.setLineDash([]);

        ctx.beginPath();
        
        if(con.type === "line"){
            if(con.dotted){
                ctx.setLineDash([10, 5]); // dashes are 10px and spaces are 10px
            }
            ctx.moveTo(end[0], end[1]);
        } else if(con.type === "has"){
            ctx.moveTo(end[0] + 2*arrowSize*0.8*(start[0] - end[0])/mag, end[1] + 2*arrowSize*0.8*(start[1] - end[1])/mag);
            ctx.lineTo(ar1[0], ar1[1]);
            ctx.lineTo(end[0], end[1]);
            ctx.lineTo(ar2[0], ar2[1]);
        } else {
            ctx.moveTo(ar1[0], ar1[1]);
            ctx.lineTo(end[0], end[1]);
            ctx.lineTo(ar2[0], ar2[1]);
        }

        if(con.type === "parent" || con.type === "interface"){
            ctx.lineTo(ar1[0], ar1[1]);
            ctx.stroke();
            if(con.type === "interface"){
                ctx.setLineDash([10, 10]); // dashes are 10px and spaces are 10px
            }
            ctx.moveTo(end[0] + arrowSize*0.8*(start[0] - end[0])/mag, end[1] + arrowSize*0.8*(start[1] - end[1])/mag);
        } else if(con.type === "has"){
            ctx.lineTo(end[0] + 2*arrowSize*0.8*(start[0] - end[0])/mag, end[1] + 2*arrowSize*0.8*(start[1] - end[1])/mag);
            ctx.fill();
        } else if(con.type !== "line"){
            ctx.lineTo(ar1[0], ar1[1]);
            ctx.fill();
            ctx.moveTo(end[0] + arrowSize*0.8*(start[0] - end[0])/mag, end[1] + arrowSize*0.8*(start[1] - end[1])/mag);
        }

        ctx.lineTo(start[0], start[1]);
        ctx.closePath();
        ctx.stroke();

        ctx.font = "12px Source Code Pro";
        if(con.startAnnotation !== undefined){
            ctx.fillText(con.startAnnotation, startAn[0], startAn[1]);
        }
        
        if(con.endAnnotation !== undefined){
            ctx.fillText(con.endAnnotation, endAn[0], endAn[1]);
        }
    }
}

/* ########## */
function loadDemosRoute(routeChanged, docPage){
    const demos = [
        {
            name: "Basic Setup",
            link: "setup",
            page: "setup.html"
        },
        {
            name: "Platformer",
            link: "platformer",
            page: "platformer.html"
        }
    ];

    if(routeChanged){
        const sidebar = $('#sidebar');
        sidebar.empty();

        // Fill the sidebar with the list of demos
        for(let demo of demos){
            // Create a new file
            let file = makeFile(demo.link, "demos/", demo.name);
        
            // Append it to the parent element
            sidebar.append(file);
        }
    }

    // Render the route
    if(docPage.length === 0){
        $("#content").html("Welcome to demos");
    } else {
        // Extract the demo info
        let demoName = docPage[0];

        let demo = null;

        for(let d of demos){
            if(d.link === demoName){
                demo = d;
            }
        }

        console.log(demo);
        console.log(demo.page);

        if(demo !== null){
            $("#content").load("demos/" + demo.page);
        } else {
            content.html("No page exists");
        }

    }
}

/* ########## */
function loadGuidesRoute(routeChanged, docPage){
    const demos = [
        {
            name: "Basic Setup",
            link: "setup",
            page: "setup.html"
        },
        {
            name: "Platformer",
            link: "platformer",
            page: "platformer.html"
        }
    ];

    if(routeChanged){
        const sidebar = $('#sidebar');
        sidebar.empty();

        // Fill the sidebar with the list of guides
        for(let demo of demos){
            // Create a new file
            let file = makeFile(demo.link, "guides/", demo.name);
        
            // Append it to the parent element
            sidebar.append(file);
        }
    }

    // Render the route
    if(docPage.length === 0){
        $("#content").html("Welcome to Guides");
    } else {
        // Extract the demo info
        let demoName = docPage[0];

        let demo = null;

        for(let d of demos){
            if(d.link === demoName){
                demo = d;
            }
        }

        console.log(demo);
        console.log(demo.page);

        if(demo !== null){
            $("#content").load("guides/" + demo.page);
        } else {
            content.html("No page exists");
        }

    }
}

/* ########## */
function loadResourcesRoute(routeChanged, docPage){
    if(routeChanged){
        // Get the sidebar
        const sidebar = $("#sidebar");

        // Clear the sidebar
        sidebar.empty();
    }

    $("#content").empty();

    $("#content").load("resources.html");

}

/* ############################## */

/* ########## DEFAULT HTML CONSTRUCTORS ########## */
function makeFolder(name){
    return $(`
    <div class="folder closed">
        <div class="folder-name code">${name}</div>
    </div>`);
}

function makeFile(linkName, path, name){
    return $(`<a href="#${path + linkName}" class="file code">${name !== undefined ? name : linkName}</a>`);
}

function makeTitle(name){
    return $(`<h1>${name}</h1>`);
}

function makeRelations(parent, implements){
    if(parent !== null){
        return $(`<div id="class-relations">${linkFromType(parent)}</div>`);
    } else {
        return $(`<br>`);
    }
}

function makeDescription(desc){
    return $(`<div class="class-description">${replaceEscapes(desc)}</div>`);
}

function makeMembers(members){
    let membersContainer = $(`<div class="members"></div>`);

    for(let member of members){
        let memberItem = $(`
            <div class="member">
                <h3 class="code">${
                    (member.access.accessLevel === "public" ? "" : member.access.accessLevel) +
                    (member.access.isStatic ? " static " : " ") +
                    (member.access.readonly ? "readonly " : "") +
                    member.name}: ${linkFromType(member.type)}</h3>
                <div class="member-description">${replaceEscapes(member.annotation)}</div>
                <br>
            </div>`);

        membersContainer.append(memberItem); 
    }

    return membersContainer;
}

function makeFunctions(functions){
    const funcContainer = $(`<div class="functions"></div>`);

    for(let func of functions){
        const funcItem = $(`
            <div class="function">
                <h3 class="code">${
                    (func.access.accessLevel === "public" ? "" : func.access.accessLevel) +
                    (func.access.isStatic ? " static " : " ") +
                    replaceFunctionTypes(func.header)}</h3>
                <div class="function-description">${replaceEscapes(func.description)}</div>
            </div>`);

        const params = $(`<div class="params"><h4>Parameters</h4><div>`);

        if(func.params.length > 0){
            const table = $(`
                <table class="param-table">
                    <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Description</th>
                    </tr>
                </table> 
            `)
        
            for(let param of func.params) {
                table.append(`
                    <tr>
                        <td>${param.name}</td>
                        <td>${linkFromType(param.type)}</td>
                        <td>${replaceEscapes(param.description)}</td>
                    </tr>
                `);
            }
            params.append(table);
        } else {
            params.append(`<div>None</div>`);
        }

        funcItem.append(params);

        const returnDesc = $(`<div class="func-return"><h4>Returns:</h4></div>`);

        if(func.type === "void" || func.type === ""){
            returnDesc.append(`<div style="margin-left: 30px">void</div>`);
        } else {
            returnDesc.append(`<div style="margin-left: 30px">${linkFromType(func.type)} - ${replaceEscapes(func.returnDescription)}</div>`);
        }

        funcItem.append(returnDesc);

        funcItem.append(BR); 
        funcContainer.append(funcItem); 
    }

    return funcContainer;
}

function makeUMLItem(data, obj, link, sizeAndPosition){
    if(data === null){
        throw `Data is null for "${obj.name}"`;
    }

    const umlBox = $(`<div id=${data.name} class="uml-box code"></div>`);

    const umlHeader = $(`<div class="uml-header"><div>${(data.isInterface ? "&lt;&lt;interface&gt;&gt; " : "") + linkFromType(data.name)}</div></div>`);

    if(link !== undefined){
        umlHeader.append(`<div><a href="/#diagrams/${link.destination}">${link.text}</a></div>`);
    }

    const umlDescription = $(`<div class="uml-description">${obj.description}</div>`);

    const umlMembers = $(`<div class="uml-members"></div>`);
    for(let member of data.members){
        let access = "+";
        access = member.access.accessLevel === "private" ? "-" : access;
        access = member.access.accessLevel === "protected" ? "#" : access;

        umlMembers.append(`<div>${access}${member.name}: ${linkFromType(member.type)}</div>`);
    }

    if(data.members.length === 0){
        umlMembers.append(BR);
    }
    
    const umlFunctions = $(`<div class="uml-functions"></div>`);
    for(let func of data.functions){
        let access = "+";
        access = func.access.accessLevel === "private" ? "-" : access;
        access = func.access.accessLevel === "protected" ? "#" : access;

        umlFunctions.append(`<div>${access}${replaceFunctionTypes(func.header)}</div>`);
    }

    if(data.functions.length === 0){
        umlFunctions.append(BR);
    }

    umlBox.append(umlHeader);
    umlBox.append(umlDescription);
    umlBox.append(umlMembers);
    umlBox.append(umlFunctions);

    for(let key in sizeAndPosition){
        umlBox.css(key, sizeAndPosition[key]);
    }

    return umlBox;
}

function makeUMLNote(name, content, sizeAndPosition){
    const umlHeader = $(`<div class="uml-header"><div>${replaceReferences(content)}</div></div>`);

    const umlBox = $(`<div id=${name} class="uml-box code"></div>`);

    umlBox.append(umlHeader);

    for(let key in sizeAndPosition){
        umlBox.css(key, sizeAndPosition[key]);
    }

    return umlBox;
}

function makeUMLBox(name, sizeAndPosition){
    const umlBox = $(`<div id=${name} class="uml-box code"></div>`);

    for(let key in sizeAndPosition){
        umlBox.css(key, sizeAndPosition[key]);
    }

    return umlBox;
}

/* ############################## */

/* ########## UTIL FUNCTIONS ########## */
function replaceEscapes(text){
    if(text === null){
        return text;
    }

    return replaceLinks(replaceReferences(text));
}

function replaceReferences(text){    
    const pattern = /@reference\[\w*\]/g;
    return text.replaceAll(pattern, (match) => linkFromType(match.substring(11, match.length - 1)));
}

function replaceLinks(text){
    const pattern = /@link\(([^\)]*)\)\(([^\)]*)\)/g;

    return text.replaceAll(pattern, (match, text, link) => {
        return `<a href="${link}" target="_blank">${text}</a>`;
    });
}

function linkFromType(name){
    const builtinTypes = ["void", "string", "String", "number", "boolean", "Float32Array"];

    if(name === undefined){
        return name;
    }

    return name.split("|").map(type => {
        type = type.trim();

        if(builtinTypes.includes(type)) {
            return type;
        }

        return `<a href="${window.router.link(type)}">${type.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</a>`;
    }).join(" | ");
}

function replaceFunctionTypes(text){
    const pattern = /:\s*\w+/g;
    return text.replaceAll(pattern, (match) => ": " + linkFromType(match.substring(1, match.length).trim()));
}

function getData(name){
    let path = window.router.link(name).split("/");
    let index = 1;
    let foundNext = true;
    let data = window.docData;

    while(foundNext){
        foundNext = false;

        for(let item of data){
            if(item.name === name && item.type === "file"){
                return item.data;
            }

            if(item.name === path[index]) {
                data = item.data;
                index += 1;
                foundNext = true;
                break;
            }
        }
    }

    // We didn't find anything
    return null;
}

function normalize(vec){
    let mag = Math.sqrt(vec[0]*vec[0] + vec[1]*vec[1]);
    return [vec[0]/mag, vec[1]/mag];
}

function getArrowDirections(vec){
    let norm1 = [-vec[1], vec[0]];
    let norm2 = [vec[1], -vec[0]];

    let v1 = normalize([norm1[0] - 2*vec[0], norm1[1] - 2*vec[1]]);
    let v2 = normalize([norm2[0] - 2*vec[0], norm2[1] - 2*vec[1]]);

    return [v1, v2];
}