

const track = document.getElementById("track");
const slides = Array.from(track.children);
const nav = document.getElementById("nav");
const dots = Array.from(nav.children);
const slideWidth = slides[0].getBoundingClientRect().width;
var count = 1;

slides.forEach(leftmove)

function leftmove(slide, index,a){
    var left = slideWidth * index + 'px';
    var add = 'left-['+left+']';
    a[index].classList.add(add);
}

function moveBy(){
    const currentSlide = track.querySelector('.currentSlide');
    var first = document.getElementById("firstSlide");
    var nextSlide = 0;
 
    if (currentSlide.id == "firstSlide"){
        count = 1;
    } else {
        count++;
    }

    if (currentSlide.id != "lastSlide"){
        currentSlide.classList.remove("currentSlide");
        nextSlide = currentSlide.nextElementSibling;
        nextSlide.classList.add("currentSlide");
    }

    var newTranslate = slideWidth * count + 'px';
    // var oldTranslate = slideWidth * reduce + 'px';

    // var removeTranslate = '-translate-x-['+oldTranslate+']';
    var addTranslate = '-translate-x-['+newTranslate+']';

    // console.log('removeTranslate:', removeTranslate);
    console.log('addTranslate', addTranslate);
    console.log('count', count)
    
    track.classList.add(addTranslate);
    // track.classList.remove(oldTranslate);
}