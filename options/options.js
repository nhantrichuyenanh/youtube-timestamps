let saveTimeout = null;

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
            console.log('Settings auto-saved:', { maxResults });
        });
    }, 500);
}

document.addEventListener('DOMContentLoaded', function () {
    const maxResultsInput = document.getElementById('maxResults');

    browser.storage.sync.get(['maxResults']).then(function (result) {
        if (result.maxResults && result.maxResults >= 1) {
            maxResultsInput.value = result.maxResults;
            console.log('Settings loaded:', { maxResults: result.maxResults });
        }
    });
    maxResultsInput.addEventListener('input', debouncedSave);
    maxResultsInput.addEventListener('change', debouncedSave);
});