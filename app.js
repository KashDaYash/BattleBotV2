const view = document.getElementById("view");

document.querySelectorAll("nav button").forEach(btn=>{
  btn.onclick = ()=> loadPage(btn.dataset.page);
});

function loadPage(page){
  fetch(`/src/pages/${page}.html`)
    .then(r=>r.text())
    .then(html=> view.innerHTML = html);
}

loadPage("profile");