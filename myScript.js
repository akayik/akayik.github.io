var prevScrollpos = window.pageYOffset;
var header = document.getElementById("header");
header.classList.remove("drop-shadow-lg");
var navStatus = 0;

document.onkeydown = function(evt) {
    evt = evt || window.event;
    if (evt.keyCode == 27 && navStatus == open) {
        closeNav();
    }
};

function smallHeader(){
    if (document.body.scrollTop > 80 || document.documentElement.scrollTop > 80) {
        header.classList.remove("py-8");
        header.classList.add("py-4", "drop-shadow-lg");
    } else {
        header.classList.add("py-8");
        header.classList.remove("py-4", "drop-shadow-lg");
    }
}

function case_smallHeader(){
    if (document.body.scrollTop > 80 || document.documentElement.scrollTop > 80) {
        header.classList.remove("py-8");
    } else {
        header.classList.add("py-8");
    }
}

function caseHeaderBg(){
    var section = document.getElementById("blueDiv");
    var image = document.getElementById("heroImage");
    var sBottom = section.getBoundingClientRect().bottom;
    var iBottom = image.getBoundingClientRect().bottom;
    var sTop = section.getBoundingClientRect().top;
    var blueLogo = "img/logo-blue.svg";
    var blueBurger = "img/burger-blue.svg";

    console.log(sTop);

    if (iBottom > 0){
        //bg-transparent and icons white
        header.classList.remove("bg-akayik-900", "bg-white");
        header.classList.add("bg-transparent");
        document.getElementById("logoContainer").src = "img/logo-white.svg";
        document.getElementById("burgerContainer").src = "img/burger-white.svg";
    }
    if (sBottom > 0 && iBottom <= 0){
        //bg-akayik and icons white
        header.classList.remove("bg-white", "bg-transparent");
        header.classList.add("bg-akayik-900");
        document.getElementById("logoContainer").src = "img/logo-white.svg";
        document.getElementById("burgerContainer").src = "img/burger-white.svg";
    }
    if (sBottom <=0){
        //bg-white and icons blue
        header.classList.remove("bg-transparent", "bg-akayik-900");
        header.classList.add("bg-white");
        document.getElementById("logoContainer").src = "img/logo-blue.svg";
        document.getElementById("burgerContainer").src = "img/burger-blue.svg";
    }

}

function slideHeader(){
    var currentScrollPos = window.pageYOffset;
    if (currentScrollPos < 200){
        header.classList.remove("-top-24");
        header.classList.add("top-0");
    } else if (prevScrollpos > currentScrollPos) {
        header.classList.remove("-top-24");
        header.classList.add("top-0");
    } else {
        header.classList.add("top-0");
        header.classList.add("-top-24");
    }
    prevScrollpos = currentScrollPos;
}


function closeNav() {
    var x = document.getElementById("fullNav");
    x.classList.add("-translate-y-full");
    var y = document.getElementById("body");
    y.classList.remove("overflow-hidden");
    y.classList.add("overflow-y-scroll");
    var z = document.getElementById("header");
    z.classList.remove("hidden");
    navStatus = closed;
}

function openNav() {
    var x = document.getElementById("fullNav");
    x.classList.remove("-translate-y-full");
    var y = document.getElementById("body");
    y.classList.remove("overflow-y-scroll");
    y.classList.add("overflow-hidden");
    var z = document.getElementById("header");
    z.classList.add("hidden");
    navStatus = open;
}

function moreButton() {
    var x = document.getElementById("readMore");
    x.classList.add("hidden");
    var y = document.getElementById("secondParagraph");
    y.classList.remove("hidden");
    y.classList.add("block");
    var z = document.getElementById("readLess");
    z.classList.add("block", "lg:hidden");
    z.classList.remove("hidden");
}

function lessButton() {
    var x = document.getElementById("readMore");
    x.classList.remove("hidden");
    x.classList.add("block");
    var y = document.getElementById("secondParagraph");
    y.classList.remove("block");
    y.classList.add("hidden");
    var z = document.getElementById("readLess");
    z.classList.add("hidden");
    z.classList.remove("block");
}

function accordion(name) {
    var a = window.innerWidth;
    if (a < 1024){
        var x = document.getElementById(name);
        var y = document.getElementById(name).nextElementSibling;
        var z = x.querySelector('.opacity-50');
    if (y.classList.contains('hidden')){
        x.classList.remove("border-b-2");
        y.classList.remove("hidden");
        y.classList.add("block", "border-b-2", "mb-2");
        z.classList.add("rotate-180");
    } else  {
        x.classList.add("border-b-2", "lg:border-b-0");
        y.classList.add("hidden");
        y.classList.remove("border-b-2", "mb-2", "block");
        z.classList.remove("rotate-180");
    }
    }
}

function hideLoader() {
    var x = document.getElementById("loader");
    x.classList.add("-translate-y-full");
    var y = document.getElementById("body");
    y.classList.remove("overflow-hidden");
    y.classList.add("overflow-y-scroll");
}

