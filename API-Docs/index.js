function copyUrl(urlId) {
  let urlText = document.getElementById(urlId).textContent.trim();

  var tempTextarea = document.createElement("textarea");

  tempTextarea.value = urlText;

  document.body.appendChild(tempTextarea);

  tempTextarea.select();

  document.execCommand("copy");

  document.body.removeChild(tempTextarea);

  var clipboardMessage = document.getElementById("clipboardMessage");
  clipboardMessage.style.display = "block";

  setTimeout(function () {
    clipboardMessage.style.display = "none";
  }, 2000);
}

function openFullscreen(imageSrc) {
  var img = new Image();
  img.src = imageSrc;

  img.addEventListener("click", closeFullscreen);

  document.getElementById("fullscreen").appendChild(img);

  document.getElementById("fullscreen").style.display = "flex";
}

function closeFullscreen() {
  document.getElementById("fullscreen").innerHTML = "";

  document.getElementById("fullscreen").style.display = "none";
}

function updateHexCode() {
  var colorInput = document.getElementById("colorInput");
  var hexCode = document.getElementById("hexCode");
  var copyButton = document.getElementById("copyButton");

  var rgb = colorInput.value;
  hexCode.innerHTML = rgb;

  // Show the copy button
  copyButton.style.display = "inline-block";
}

document.getElementById("colorInput").addEventListener("change", updateHexCode);
