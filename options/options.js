let saveTimeout = null;

function showSaveIndicator() {
    const indicator = document.getElementById('saveIndicator');
    indicator.classList.add('show');

    setTimeout(() => {
        indicator.classList.remove('show');
    }, 2000);
}

function debouncedSave() {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(() => {
        const maxResults = parseInt(document.getElementById('maxResults').value);

        if (isNaN(maxResults) || maxResults < 1) {
            return;
        }

        browser.storage.sync.set({ maxResults }, () => {
            showSaveIndicator();
            console.log('Settings auto-saved:', { maxResults });
        });
    }, 500);
}

document.addEventListener('DOMContentLoaded', function () {
    const maxResultsInput = document.getElementById('maxResults');

    browser.storage.sync.get(['maxResults']).then(function (result) {
        const defaultValue = 100;
        const maxResults = result.maxResults && result.maxResults >= 1 ? result.maxResults : defaultValue;
        maxResultsInput.value = maxResults;
        console.log('Settings loaded:', { maxResults });
    });

    maxResultsInput.addEventListener('input', debouncedSave);
    maxResultsInput.addEventListener('change', debouncedSave);
});