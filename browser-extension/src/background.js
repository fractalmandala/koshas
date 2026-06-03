import {
	buildImageCapture,
	buildKoshasAddUrl,
	buildPageCapture,
	buildSelectionCapture
} from './protocol-url.js';
import { createPendingStore } from './pending-store.js';

const MENU_IDS = {
	page: 'koshas-save-page',
	selection: 'koshas-save-selection',
	image: 'koshas-save-image'
};

const pendingStore = createPendingStore(chrome.storage.local);

function createMenus() {
	chrome.contextMenus.removeAll(() => {
		chrome.contextMenus.create({
			id: MENU_IDS.page,
			title: 'Save page to Koshas',
			contexts: ['page']
		});
		chrome.contextMenus.create({
			id: MENU_IDS.selection,
			title: 'Save selection to Koshas',
			contexts: ['selection']
		});
		chrome.contextMenus.create({
			id: MENU_IDS.image,
			title: 'Save image to Koshas',
			contexts: ['image']
		});
	});
}

async function launchKoshas(url) {
	await chrome.tabs.create({ url, active: false });
}

async function queueAndLaunch(capture) {
	const koshasUrl = buildKoshasAddUrl(capture);

	await pendingStore.enqueue(koshasUrl);
	await launchKoshas(koshasUrl);
}

chrome.runtime.onInstalled.addListener(createMenus);
chrome.runtime.onStartup.addListener(createMenus);

chrome.contextMenus.onClicked.addListener((info, tab) => {
	let capture;

	if (info.menuItemId === MENU_IDS.selection) {
		capture = buildSelectionCapture(info, tab);
	} else if (info.menuItemId === MENU_IDS.image) {
		capture = buildImageCapture(info, tab);
	} else {
		capture = buildPageCapture(tab);
	}

	void queueAndLaunch(capture);
});
