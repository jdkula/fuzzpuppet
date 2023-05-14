function goodbye() {
  console.log("goodbye");
}

function hello() {
  console.log("Hello from the hello function");
}
function greet() {
  try {
    for (let i = 0; i < 10; i++) {
      hello();
    }
    goodbye();
  } catch (e) {
    alert("Error");
  } finally {
    goodbye();
  }
}

// greet();
