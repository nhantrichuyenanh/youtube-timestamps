let saveTimeout = null;

function isValidInt(v, min = -Infinity) {
    return Number.isFinite(v) && Number.isInteger(v) && v >= min;
}
function isValidFloat(v, min = -Infinity, max = Infinity) {
    return Number.isFinite(v) && v >= min && v <= max;
}

function debouncedSave() {
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(async () => {
        const payload = {};
        const maxResultsRaw = document.getElementById('maxResults').value;
        const maxConcurrentRaw = document.getElementById('maxConcurrentOverlays').value;
        const overlayDurationRaw = document.getElementById('overlayDuration').value;
        const overlayOpacityRaw = document.getElementById('overlayOpacity').value;

        if (maxResultsRaw !== '') {
            const v = parseInt(maxResultsRaw, 10);
            if (isValidInt(v, 1)) payload.maxResults = v;
            else return;
        }

        if (maxConcurrentRaw !== '') {
            const v = parseInt(maxConcurrentRaw, 10);
            if (isValidInt(v, 1)) payload.maxConcurrentOverlays = v;
            else return;
        }

        if (overlayDurationRaw !== '') {
            const v = parseInt(overlayDurationRaw, 10);
            if (isValidInt(v, 1)) payload.overlayDuration = v * 1000;
            else return;
        }

        if (overlayOpacityRaw !== '') {
            const v = parseFloat(overlayOpacityRaw);
            if (isValidFloat(v, 0.1, 1)) payload.overlayOpacity = v;
            else return;
        }

        if (Object.keys(payload).length === 0) {
            return;
        }

        try {
            await browser.storage.sync.set(payload);
        } catch (err) {
        }
    }, 500);
}

async function restoreOptions() {
    try {
        const keys = ['maxResults', 'maxConcurrentOverlays', 'overlayDuration', 'overlayOpacity'];
        const items = await browser.storage.sync.get(keys);

        if (items.hasOwnProperty('maxResults')) {
            document.getElementById('maxResults').value = items.maxResults;
        } else {
            document.getElementById('maxResults').value = '';
        }

        if (items.hasOwnProperty('maxConcurrentOverlays')) {
            document.getElementById('maxConcurrentOverlays').value = items.maxConcurrentOverlays;
        } else {
            document.getElementById('maxConcurrentOverlays').value = '';
        }

        if (items.hasOwnProperty('overlayDuration')) {
            document.getElementById('overlayDuration').value = items.overlayDuration / 1000;
        } else {
            document.getElementById('overlayDuration').value = '';
        }

        const opacityEl = document.getElementById('overlayOpacity');
        const opacityValueLabel = document.getElementById('overlayOpacityValue');
        if (items.hasOwnProperty('overlayOpacity')) {
            opacityEl.value = items.overlayOpacity;
            opacityValueLabel.textContent = String(items.overlayOpacity);
        } else {
            opacityValueLabel.textContent = 'unset';
        }

    } catch (err) {
    }
}

async function saveOptionsManual() {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }
    const payload = {};
    const maxResultsRaw = document.getElementById('maxResults').value;
    const maxConcurrentRaw = document.getElementById('maxConcurrentOverlays').value;
    const overlayDurationRaw = document.getElementById('overlayDuration').value;
    const overlayOpacityRaw = document.getElementById('overlayOpacity').value;

    if (maxResultsRaw !== '') {
        const v = parseInt(maxResultsRaw, 10);
        if (!isValidInt(v, 1)) return alert('Max comments must be an integer ≥ 1');
        payload.maxResults = v;
    }
    if (maxConcurrentRaw !== '') {
        const v = parseInt(maxConcurrentRaw, 10);
        if (!isValidInt(v, 1)) return alert('Max concurrent comments must be an integer ≥ 1');
        payload.maxConcurrentOverlays = v;
    }
    if (overlayDurationRaw !== '') {
        const v = parseInt(overlayDurationRaw, 10);
        if (!isValidInt(v, 1)) return alert('Comment Duration must be an integer ≥ 1000 ms');
        payload.overlayDuration = v * 1000;
    }
    if (overlayOpacityRaw !== '') {
        const v = parseFloat(overlayOpacityRaw);
        if (!isValidFloat(v, 0.1, 1)) return alert('Comment Opacity must be between 0.1 and 1');
        payload.overlayOpacity = v;
    }

    if (Object.keys(payload).length === 0) {
        return;
    }

    try {
        await browser.storage.sync.set(payload);
        const status = document.getElementById('status') || createStatusNode();
        status.textContent = 'Options saved.';
        setTimeout(() => { status.textContent = ''; }, 2000);
    } catch (err) {
    }
}

function createStatusNode() {
    let status = document.getElementById('status');
    if (!status) {
        status = document.createElement('div');
        status.id = 'status';
        status.style.marginTop = '10px';
        document.body.appendChild(status);
    }
    return status;
}

document.addEventListener('DOMContentLoaded', () => {
    const maxResultsInput = document.getElementById('maxResults');
    const maxConcurrentInput = document.getElementById('maxConcurrentOverlays');
    const overlayDurationInput = document.getElementById('overlayDuration');
    const overlayOpacityInput = document.getElementById('overlayOpacity');
    const overlayOpacityValue = document.getElementById('overlayOpacityValue');

    restoreOptions();

    maxResultsInput.addEventListener('input', debouncedSave);
    maxResultsInput.addEventListener('change', debouncedSave);

    maxConcurrentInput.addEventListener('input', debouncedSave);
    maxConcurrentInput.addEventListener('change', debouncedSave);

    overlayDurationInput.addEventListener('input', debouncedSave);
    overlayDurationInput.addEventListener('change', debouncedSave);

    overlayOpacityInput.addEventListener('input', () => {
        overlayOpacityValue.textContent = overlayOpacityInput.value;
        debouncedSave();
    });
    overlayOpacityInput.addEventListener('change', debouncedSave);

    const saveButton = document.getElementById('saveOptions');
    if (saveButton) {
        saveButton.addEventListener('click', (e) => {
            e.preventDefault();
            saveOptionsManual();
        });
    }
});
