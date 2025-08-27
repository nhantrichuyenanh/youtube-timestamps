document.addEventListener('submit', async function (e) {
    e.preventDefault();
    const enabled = document.getElementById('enabled').checked;
    const maxResults = parseInt(document.getElementById('maxResults').value);
    browser.storage.sync.set({ enabled, maxResults }, function (result) {
        console.log('Settings saved');
    });
});
document.addEventListener('DOMContentLoaded',  function () {
    applyBrowserTheme();
    browser.storage.sync.get(['enabled', 'maxResults']).then(function (result) {
        if (result.enabled === undefined || result.maxResults == null || typeof result.enabled !== 'boolean') {
            result.enabled = true;
        }
        if (result.maxResults === undefined || result.maxResults < 1 || result.maxResults == null) {
            result.maxResults = 100;
        }
        document.getElementById('enabled').checked = result.enabled;
        document.getElementById('maxResults').value = result.maxResults;
        console.log('Settings loaded', result);
    })
});

async function applyBrowserTheme() {
    try {
        const theme = (await browser.theme.getCurrent());
        const root = document.documentElement;
        if (theme.colors) {
            root.style.setProperty('--background-color', theme.colors.popup || '#ffffff');
            root.style.setProperty('--text-color', theme.colors.popup_text || '#000000');
            root.style.setProperty('--border-color', theme.colors.popup_border || '#dddddd');
        }
    } catch (error) {
        console.log('Theme not available:', error);
    }
}