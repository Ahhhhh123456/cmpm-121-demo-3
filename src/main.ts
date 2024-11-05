const gameName = "Jason's Game :)";

//New button element
const button = document.createElement("button");

//Button text
button.textContent = "Test";

// BUtton styles
button.style.backgroundColor = "black";
button.style.color = "white";
button.style.padding = "10px 20px";

// Even listener for the button
button.addEventListener("click", function () {
  alert("Button clicked.");
});

// Adds the button to the website
document.body.appendChild(button);
document.title = gameName;

//test
