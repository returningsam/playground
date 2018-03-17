/*************************** CONSTANTS ****************************************/

const textShown = "GOOD";
const letterData = {
    A: [
        {
            type: "title_unit_top_left_semicircle",
            x: 0,
            y: 0
        },
        {
            type: "title_unit_top_right_semicircle",
            x: 0,
            y: 0,
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 2
        },
        {
            type: "title_unit_box",
            x: 2,
            y: 2
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 3
        },
        {
            type: "title_unit_box",
            x: 2,
            y: 3
        },
        {
            type: "title_unit_box",
            x: 2,
            y: 3
        },
        {
            type: "title_unit_box",
            x: 2,
            y: 3
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 4
        },
        {
            type: "title_unit_box",
            x: 2,
            y: 4
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 5
        },
        {
            type: "title_unit_box",
            x: 2,
            y: 5
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 6
        },
        {
            type: "title_unit_box",
            x: 2,
            y: 6
        },
    ]
    G: [
        {
            type: "title_unit_top_right_semicircle",
            x: 2,
            y: 0
        },
        {
            type: "title_unit_top_left_semicircle",
            x: 0,
            y: 0
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 2
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 3
        },
        {
            type: "title_unit_bottom_left_semicircle",
            x: 0,
            y: 4
        },
        {
            type: "title_unit_bottom_right_semicircle",
            x: 2,
            y: 4
        },
        {
            type: "title_unit_box",
            x: 3,
            y: 3
        },
        {
            type: "title_unit_box",
            x: 2,
            y: 3
        },
    ],
    H: [
        {
            type: "title_unit_box",
            x: 0,
            y: 0
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 1
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 2
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 3
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 4
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 5
        },
        {
            type: "title_unit_box",
            x: 1,
            y: 3
        },
        {
            type: "title_unit_box",
            x: 2,
            y: 3
        },
        {
            type: "title_unit_box",
            x: 3,
            y: 0
        },
        {
            type: "title_unit_box",
            x: 3,
            y: 1
        },
        {
            type: "title_unit_box",
            x: 3,
            y: 2
        },
        {
            type: "title_unit_box",
            x: 3,
            y: 3
        },
        {
            type: "title_unit_box",
            x: 3,
            y: 4
        },
        {
            type: "title_unit_box",
            x: 3,
            y: 5
        }
    ],
    L: [
        {
            type: "title_unit_box",
            x: 0,
            y: 0
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 1
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 2
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 3
        },
        {
            type: "title_unit_bottom_left_semicircle",
            x: 0,
            y: 4
        },
        {
            type: "title_unit_box",
            x: 2,
            y: 5
        }
    ],
    P: [
        {
            type: "title_unit_box",
            x: 0,
            y: 0
        },
        {
            type: "title_unit_box",
            x: 1,
            y: 0
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 1
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 2
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 3
        },
        {
            type: "title_unit_box",
            x: 1,
            y: 3
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 4
        },
        {
            type: "title_unit_box",
            x: 0,
            y: 5
        },
        {
            type: "title_unit_top_right_semicircle",
            x: 2,
            y: 0
        },
        {
            type: "title_unit_bottom_right_semicircle",
            x: 2,
            y: 2
        }
    ],
];

/*************************** UPDATING CONSTANTS *******************************/

var blockColor = "white";
var titleUnitBlockSize = 20;
var titleUnitKernSize = titleUnitBlockSize / 1.5;

var textBoxWidth = 0;
var textBoxHeight = 7 * titleUnitBlockSize;

/******************************************************************************/
/*************************** HELPER FUNCTIONS *********************************/
/******************************************************************************/

/* Returns a random integer between min (inclusive) and max (inclusive) */
var randInt = (min, max) => chance.integer({min:min,max:max});

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getDist(x1,y1,x2,y2) {
    var a = x1 - x2;
    var b = y1 - y2;
    return Math.sqrt((a*a)+(b*b));
}

/******************************************************************************/
/*************************** TEXT ELEMENTS ************************************/
/******************************************************************************/

function newUnitBlock() {
    var block = document.getElementById("div");
    block.classList.add("title_unit");
    block.style.backgroundColor = blockColor;
    return block;
}

function newUnitCurveTL() {
    var block = document.getElementById("div");
    block.classList.add("title_unit_top_left_semicircle");
    block.style.backgroundColor = blockColor;
    return block;
}

function newUnitCurveTR() {
    var block = document.getElementById("div");
    block.classList.add("title_unit_top_right_semicircle");
    block.style.backgroundColor = blockColor;
    return block;
}

function newUnitCurveBL() {
    var block = document.getElementById("div");
    block.classList.add("title_unit_bottom_left_semicircle");
    block.style.backgroundColor = blockColor;
    return block;
}

function newUnitCurveBR() {
    var block = document.getElementById("div");
    block.classList.add("title_unit_bottom_right_semicircle");
    block.style.backgroundColor = blockColor;
    return block;
}

function getLetterWidth(letter) {
    var letterWidth = 0;
    var letterElements = letterData[letter];
    for (var i = 0; i < letterElements.length; i++) {
        var curWidth;
        if (letterElements[i].type == "title_unit_box")
            curWidth = letterElements[i].x + 1;
        else curWidth = letterElements[i].x + 2;

        if (curWidth > letterWidth) letterWidth = curWidth;
    }
    return letterWidth;
}

function placeTextElements() {
    var letters = textShown.split("");
    for (var i = 0; i < letters.length; i++)
        textBoxWidth += getLetterWidth(letters[i]) * box;

    var curLeft = (window.innerWidth/2)  - (textBoxWidth/2);
    var curTop  = (window.innerHeight/2) - (textBoxHeight/2);


}

/******************************************************************************/
/*************************** INITIALIZATION ***********************************/
/******************************************************************************/

function init() {
    placeTextElements();
}

function resizeHandler() {

}

window.onload   = init;
window.onresize = resizeHandler;
