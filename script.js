import Cat from "./scripts/cat.js";

const catContainer = document.getElementById("cat-container");
const cat = new Cat(catContainer);

// PRELOADING
const loadingElement = document.querySelector("[data-loading]");

window.addEventListener("load", function () {
    loadingElement.classList.add("loaded");
    document.body.classList.remove("active");
});
