const pairBtn = document.getElementById("pairBtn");
const phoneInput = document.getElementById("phone");
const pairResult = document.getElementById("pairResult");
const qrResult = document.getElementById("qrResult");
const statusText = document.getElementById("status");

pairBtn.addEventListener("click", async () => {
  const phone = phoneInput.value.replace(/\D/g, "");

  if (!phone || phone.length < 8) {
    pairResult.textContent = "Enter a valid phone number.";
    return;
  }

  pairBtn.disabled = true;
  pairResult.textContent = "Requesting pairing code...";
  statusText.textContent = "Status: Connecting...";

  try {
    const response = await fetch("/api/pair", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ phone })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Pairing request failed.");
    }

    pairResult.textContent = data.code
      ? "Pairing code: " + data.code
      : "Pairing request submitted.";

  } catch (error) {
    pairResult.textContent = error.message;
  } finally {
    pairBtn.disabled = false;
  }
});

async function checkStatus() {
  try {
    const response = await fetch("/api/status");
    const data = await response.json();

    statusText.textContent =
      "Status: " + (data.connected ? "Connected" : "Disconnected");

    if (data.qr) {
      qrResult.innerHTML = "";

      const image = document.createElement("img");
      image.src = data.qr;
      image.alt = "WhatsApp pairing QR code";
      image.style.width = "220px";

      qrResult.appendChild(image);
    }
  } catch {
    statusText.textContent = "Status: Server unavailable";
  }
}

checkStatus();
setInterval(checkStatus, 5000);
