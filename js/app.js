const API_BASE_URL = 'https://35y15zgbia.execute-api.eu-central-1.amazonaws.com/Prod';

document.addEventListener('DOMContentLoaded', () => {
    // Video Custom Play Logic
    const videoContainer = document.getElementById('video-container');
    const video = document.getElementById('recruiting-video');
    const playOverlay = document.getElementById('play-overlay');

    if (playOverlay && video) {
        playOverlay.addEventListener('click', () => {
            playOverlay.style.opacity = '0';
            setTimeout(() => {
                playOverlay.style.display = 'none';
            }, 300);
            video.muted = false; // Ensure sound is on
            video.play();
            video.controls = true; // Show controls after starting
        });
    }

    // Form Handling
    const form = document.getElementById('application-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
});

function updateFileName() {
    const input = document.getElementById('cv');
    const label = document.getElementById('file-label');
    if (input.files && input.files.length > 0) {
        label.textContent = input.files[0].name;
        label.classList.add('text-tech-blue');
    } else {
        label.textContent = 'Datei auswählen...';
        label.classList.remove('text-tech-blue');
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    // UI Feedback
    const submitBtn = document.getElementById('submit-btn');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="animate-pulse">Wird gesendet...</span>';
    const statusMsg = document.getElementById('status-message');
    statusMsg.classList.add('hidden');

    try {
        const formData = new FormData(e.target);
        const file = document.getElementById('cv').files[0];

        if (!file) throw new Error('Bitte wähle einen Lebenslauf aus.');

        // 1. Get Presigned URL
        // We assume the API has an endpoint that handles both steps based on payload or query params,
        // OR we use distinct resources. Let's assume specific structure: POST /upload-url

        // Fetch presigned URL (invokes Lambda)
        const uploadUrlResponse = await fetch(`${API_BASE_URL}/upload-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: file.name,
                contentType: file.type
            })
        });

        if (!uploadUrlResponse.ok) throw new Error('Fehler beim Initialisieren des Uploads.');
        const { uploadUrl, fileKey } = await uploadUrlResponse.json();

        // 2. Upload File to S3
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });

        if (!uploadResponse.ok) throw new Error('Fehler beim Hochladen der Datei.');

        // 3. Submit Application Data (Trigger Email)
        const applicationData = {
            firstname: formData.get('firstname'),
            lastname: formData.get('lastname'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            fileKey: fileKey
        };

        const submitResponse = await fetch(`${API_BASE_URL}/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(applicationData)
        });

        if (!submitResponse.ok) throw new Error('Fehler beim Senden der Bewerbung.');

        // Success
        e.target.reset();
        document.getElementById('file-label').textContent = 'Datei auswählen...';
        submitBtn.innerHTML = `
            <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Gesendet!
        `;
        submitBtn.classList.remove('bg-tech-blue');
        submitBtn.classList.add('bg-green-600');

        statusMsg.textContent = "Danke! Wir melden uns ASAP bei dir. Viel Erfolg im Studium!";
        statusMsg.className = "text-center text-sm font-bold text-green-600 mt-4 block";

    } catch (error) {
        console.error(error);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        statusMsg.textContent = "Ups, da lief etwas schief: " + error.message;
        statusMsg.className = "text-center text-sm font-bold text-red-600 mt-4 block";
    }
}
