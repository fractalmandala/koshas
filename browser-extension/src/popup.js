import { createPendingStore } from './pending-store.js';

const pendingStore = createPendingStore(chrome.storage.local);

const pendingState = document.querySelector('#pending-state');
const readyState = document.querySelector('#ready-state');
const pendingCopy = document.querySelector('#pending-copy');
const launchButton = document.querySelector('#launch-button');

async function launchPendingUrls() {
	const urls = await pendingStore.drain();

	for (const url of urls) {
		await chrome.tabs.create({ url, active: false });
	}

	await render();
}

async function render() {
	const pending = await pendingStore.list();
	const hasPending = pending.length > 0;

	pendingState.hidden = !hasPending;
	readyState.hidden = hasPending;

	if (hasPending) {
		pendingCopy.textContent =
			pending.length === 1
				? 'Your capture is saved locally. Launch Koshas to send it now.'
				: `${pending.length} captures are saved locally. Launch Koshas to send them now.`;
	}
}

launchButton.addEventListener('click', () => {
	void launchPendingUrls();
});

void render();
