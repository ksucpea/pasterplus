
let currentInput = null;
let currentPos = -1;
let currentGroup = "Custom";
let lastX = 0;
let lastY = 0;

let settings = {
    autocopy: false,
    insert: true,
}

function drag(e) {
    let container = document.querySelector(".paster-container");
    let newX = lastX - e.clientX;
    let newY = lastY - e.clientY;
    container.style.top = (container.offsetTop - newY) + "px";
    container.style.left = (container.offsetLeft - newX) + "px";
    lastX = e.clientX;
    lastY = e.clientY;
}

function stopDrag() {
    let container = document.querySelector(".paster-container");
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", stopDrag);
    chrome.storage.local.set({ "position": [container.style.left, container.style.top] });
}

function changeWidth(width) {
    document.querySelector(".paster-container").style.setProperty("--paster-width", width + "px", "important");
}

function changeHeight(height) {
    document.querySelector(".paster-container").style.setProperty("--paster-height", height + "px", "important");
}

function applyVariables(vars) {
    Object.keys(vars).forEach(key => {
        switch (key) {
            case "open":
                vars["open"] === true ? run() : close();
                break;
            case "position":
                changePos(vars["position"][0], vars["position"][1]);
                break;
            case "settings":
                Object.keys(vars["settings"]).forEach(setting => {
                    switch (setting) {
                        case "color":
                            changeColor(vars["settings"]["color"]);
                            break;
                        case "fontsize":
                            changeFontSize(vars["settings"]["fontsize"]);
                            break;
                        case "width":
                            changeWidth(vars["settings"]["width"]);
                            break;
                        case "height":
                            changeHeight(vars["settings"]["height"]);
                            break;
                        case "autocopy":
                            settings["autocopy"] = vars["settings"]["autocopy"];
                            break;
                        case "insert":
                            settings["insert"] = vars["settings"]["insert"];
                            break;
                    }
                });
                break;
        }

    });
}

chrome.storage.onChanged.addListener((changes, namespace) => {
    Object.keys(changes).forEach(key => changes[key] = changes[key]["newValue"]);
    applyVariables(changes);
});

function changeFontSize(size) {
    let paster = document.querySelector(".paster-container");
    paster.style.setProperty("--paster-item-size", size + "px");
}

function changePos(x, y) {
    const menu = document.querySelector(".paster-container");
    let left = parseInt(x), top = parseInt(y);
    if (left < 0) {
        menu.style.left = "20px";
    } else if (left > window.innerWidth - 400) {
        menu.style.left = (window.innerWidth - 400) + "px";
    } else {
        menu.style.left = x;
    }

    if (top < 0) {
        menu.style.top = "20px";
    } else if (top > window.innerHeight - 300) {
        menu.style.top = (window.innerHeight - 300) + "px";
    } else {
        menu.style.top = y;
    }
}

function changeColor(color) {
    document.querySelector(".paster-container").style.setProperty("--paster-color", color, "important");
}

function run() {

    chrome.storage.local.get(["position", "current_group", "open", "settings"], storage => {

        if (storage["open"] !== true) return;

        let paster = document.querySelector(".paster-container");
        if (paster) {
            paster.style.display = "flex";
            return;
        }

        currentGroup = storage["current_group"];

        const container = el("div", "paster-container", null);
        document.body.appendChild(container);

        applyVariables(storage);

        const leftSide = el("div", "paster-groups-container", null);
        const groupsContainer = el("div", "paster-groups", null);
        const addGroupBtn = el("button", "paster-add-group", "+ Group");
        addGroupBtn.addEventListener("click", () => {
            displayGroupCreate();
        });
        leftSide.appendChild(addGroupBtn);
        leftSide.appendChild(groupsContainer);
        container.appendChild(leftSide);

        const rightSide = el("div", "paster-main", null);
        container.appendChild(rightSide);

        const headerContainer = el("div", "paster-header-container", null);
        rightSide.appendChild(headerContainer);

        const header = el("h2", "paster-header", "PasterPlus");
        headerContainer.appendChild(header);

        const exitBtn = el("button", "paster-exit-btn", null);
        const exitIcon = el("img", "paster-exit-icon", null);
        exitIcon.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='feather feather-x'%3E%3Cline x1='18' y1='6' x2='6' y2='18'/%3E%3Cline x1='6' y1='6' x2='18' y2='18'/%3E%3C/svg%3E";
        exitBtn.appendChild(exitIcon);
        exitBtn.addEventListener("click", () => {
            chrome.storage.local.set({ "open": false });
        });
        headerContainer.appendChild(exitBtn);

        const savedContainer = el("div", "paster-saved-container", null);
        savedContainer.style.display = "block";
        rightSide.appendChild(savedContainer);

        const settingsContainer = el("div", "paster-settings-container", null);
        settingsContainer.style.display = "none";
        rightSide.appendChild(settingsContainer);

        const createContainer = el("div", "paster-create-container", null);
        createContainer.style.display = "none";
        rightSide.appendChild(createContainer);

        const savedBtns = el("div", "paster-saved-btns", null);
        savedContainer.appendChild(savedBtns);

        displayGroup(currentGroup);

        document.body.addEventListener("click", function (e) {
            if (e.target.className.includes("paster-")) return;
            currentPos = e.target.selectionStart || e.target.selectionEnd || -1;
            currentInput = e.target;
            let selection = window.getSelection();
            if (selection && selection.toString() !== "") {
                document.querySelector(".paster-add-input").value = selection;
                if (storage["settings"]["autocopy"] === true) {
                    navigator.clipboard.writeText(selection);
                }
            }
        });

        document.body.addEventListener("mousedown", (e) => {
            if (!e.target.className.includes("paster-") || e.target.className.includes("paster-add-input") || e.target.className.includes("paster-saved-btn")) return;
            lastX = e.clientX;
            lastY = e.clientY;
            document.addEventListener("mouseup", stopDrag);
            document.addEventListener("mousemove", drag);
        });

    });
}

function displayGroup(group) {
    currentGroup = group;
    const groupsContainer = document.querySelector(".paster-groups");

    chrome.storage.local.get("saved", storage => {

        groupsContainer.textContent = "";
        let keys = Object.keys(storage["saved"]);
        keys.forEach(key => {
            let groupSelect = el("li", "paster-group", key);
            groupSelect.addEventListener("click", () => displayGroup(key));
            if (key === currentGroup) groupSelect.classList.add("paster-active");
            groupsContainer.appendChild(groupSelect);
        });

        const settingsBtn = el("li", "paster-settings-btn paster-group", "Settings");
        settingsBtn.addEventListener("click", () => {
            document.querySelector(".paster-group.paster-active").classList.remove("paster-active");
            document.querySelector(".paster-settings-btn").classList.add("paster-active");
            displaySettings();
        });
        groupsContainer.appendChild(settingsBtn);

        chrome.storage.local.set({ "current_group": group });
        refreshSaved(group);
    });

}

let resetConfirmCopy = null;

function showConfirmCopy(x, y) {
    let container = document.querySelector(".paster-container");
    let el = document.getElementById("paster-confirm-copy");
    el.style.left = (x - container.offsetLeft) + "px";
    el.style.top = (y - container.offsetTop) + "px";
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = null;
    el.className = "paster-show-confirm";
    clearTimeout(resetConfirmCopy);
    resetConfirmCopy = setTimeout(() => {
        el.className = "";
        el.style.top = "0px";
    }, 750);
}

function refreshSaved(group) {
    const savedContainer = document.querySelector(".paster-saved-container");
    const savedBtns = document.querySelector(".paster-saved-btns");

    chrome.storage.local.get(["saved", "settings"], storage => {
        document.querySelector(".paster-header").textContent = "PasterPlus";

        let els = [];

        const confirmCopiedText = document.querySelector("#paster-confirm-copy") || el("p", "", "Copied!");
        confirmCopiedText.id = "paster-confirm-copy";
        confirmCopiedText.style = "position: fixed; top: -20px; left: -20px;z-index: 1;";
        savedContainer.appendChild(confirmCopiedText);

        for (i = 0; i < storage["saved"][group].length; i++) {
            const save = storage["saved"][group][i];
            let copySave = el("div", "paster-saved-btn", save);
            copySave.addEventListener("click", () => {
                navigator.clipboard.writeText(save);
                document.querySelector(".paster-add-input").value = save;
                if (storage["settings"] && storage["settings"]["showconfirm"] === true) {
                    let bounds = copySave.getBoundingClientRect();
                    showConfirmCopy(bounds.x, bounds.y);
                }
                let pasteOnClick = (e) => {
                    if (e.target.nodeName === "INPUT" || e.target.nodeName === "TEXTAREA") {
                        e.target.value += save;
                    }
                    document.body.removeEventListener("mouseup", pasteOnClick);
                }
                if (storage["settings"] && storage["settings"]["insert"] === true) {
                    document.body.addEventListener("mouseup", pasteOnClick);
                }
            });
            const removeBtn = el("button", "paster-remove-btn", "x");
            removeBtn.addEventListener("click", () => {
                chrome.storage.local.get("saved", storage => {
                    let delAt = -1;
                    for (i = 0; i < storage["saved"][group].length; i++) {
                        if (storage["saved"][group][i] === save) {
                            delAt = i;
                            break;
                        }
                    }
                    if (delAt >= 0) {
                        storage["saved"][group].splice(delAt, 1);
                        chrome.storage.local.set({ "saved": { ...storage["saved"], [group]: storage["saved"][group] } }).then(() => { copySave.style.display = "none" });
                    }
                })
            });
            copySave.appendChild(removeBtn);
            els.push(copySave);
        }

        let addInput = document.querySelector(".paster-add-input");
        let btns = document.querySelector(".paster-btns");
        let addBtn = document.querySelector(".paster-add-btn");
        let editBtn = document.querySelector(".paster-edit-btn");

        if (addInput === null) {
            addInput = el("textarea", "paster-add-input", null);
        }

        if (btns === null) {
            btns = el("div", "paster-btns", null);
            addBtn = el("button", "paster-add-btn", "Add");
            addBtn.addEventListener("click", () => {
                chrome.storage.local.get("saved", (_storage) => {
                    chrome.storage.local.set({ "saved": _storage["saved"] ? { ..._storage["saved"], [currentGroup]: _storage["saved"][currentGroup].concat([addInput.value]) } : { "Custom": [addInput.value] } }, () => {
                        refreshSaved(currentGroup);
                    });
                })
            });

            editBtn = el("button", "paster-edit-btn", "Edit");
            editBtn.addEventListener("click", () => {
                setEditing(document.querySelectorAll(".paster-remove-btn")[0].style.display === "inline-block" ? false : true);
            });

            btns.appendChild(addBtn);
            btns.appendChild(editBtn);
        }

        savedBtns.textContent = "";
        els.forEach(el => savedBtns.appendChild(el));
        savedContainer.appendChild(addInput);
        savedContainer.appendChild(btns);
        savedContainer.style.display = "block";
        document.querySelector(".paster-create-container").style.display = "none";
        document.querySelector(".paster-settings-container").style.display = "none";
    });
}

function close() {
    let paster = document.querySelector(".paster-container");
    if (paster) paster.style.display = "none";
}

function setEditing(val) {
    document.querySelectorAll(".paster-remove-btn").forEach(btn => {
        document.querySelector(".paster-edit-btn").textContent = val === true ? "Stop" : "Edit";
        btn.style.display = val === true ? "inline-block" : "none";
    });
}

function displayGroupCreate() {
    const createContainer = document.querySelector(".paster-create-container");
    createContainer.textContent = "";

    let backBtn = el("button", "paster-back-btn", "< Back");
    backBtn.addEventListener("click", () => {
        document.querySelector(".paster-header").textContent = "PasterPlus";
        document.querySelector(".paster-saved-container").style.display = "block";
        createContainer.style.display = "none";
    });
    createContainer.appendChild(backBtn);

    let groupInput = el("input", "paster-group-input");
    groupInput.placeholder = "Enter group name";
    createContainer.appendChild(groupInput);

    let groupAddBtn = el("button", "paster-group-add", "Create");
    groupAddBtn.addEventListener("click", () => {
        if (groupInput.value === "") return;
        chrome.storage.local.get("saved", storage => {
            chrome.storage.local.set({ "saved": { ...storage["saved"], [groupInput.value]: [] } }).then(() => displayGroup(groupInput.value));
        })
    });

    let groupDelBtn = el("button", "paster-group-del", "Delete");
    groupDelBtn.addEventListener("click", () => {
        const val = groupInput.value;
        if (val === "") return;
        chrome.storage.local.get("saved", storage => {
            if (val in storage["saved"]) {
                delete storage["saved"][val];
                let keys = Object.keys(storage["saved"]);
                if (keys.length >= 1) {
                    chrome.storage.local.set({ "saved": storage["saved"] }).then(() => displayGroup(keys[0]));
                }
            }
        });

    });

    let btnContainer = el("div", "paster-btn-container", null);
    btnContainer.appendChild(groupAddBtn);
    btnContainer.appendChild(groupDelBtn);
    createContainer.appendChild(btnContainer);

    document.querySelector(".paster-header").textContent = "Edit groups";

    showTab(".paster-create-container");
}

function createSetting(key, value) {
    let setting = el("div", "paster-setting", null);
    let settingInput = el("input", "paster-setting-input", null);
    let settingDescription = el("span", "paster-setting-des", null);
    switch (key) {
        case "fontsize":
            settingInput.type = "number";
            settingDescription.textContent = "Font size of items";
            break;
        case "color":
            settingInput.type = "text";
            settingDescription.textContent = "Main color";
            break;
        case "insert":
            settingInput.type = "checkbox";
            settingDescription.textContent = "Paste item on click";
            break;
        case "autocopy":
            settingInput.type = "checkbox";
            settingDescription.textContent = "Auto copy highlighted text";
            break;
        case "width":
            settingInput.type = "number";
            settingDescription.textContent = "Menu width";
            break;
        case "height":
            settingInput.type = "number";
            settingDescription.textContent = "Menu max height";
            break;
        case "showconfirm":
            settingInput.type = "checkbox";
            settingDescription.textContent = "Show \"Copied!\" message";
            break;
    }
    if (settingInput.type === "checkbox") {
        settingInput.checked = value;
        settingInput.addEventListener("change", (e) => {
            updateSetting({ [key]: e.target.checked });
        });
    } else {
        settingInput.value = value;
        settingInput.addEventListener("change", (e) => {
            let value = key === "width" && e.target.value < 200 ? 200 : e.target.value;
            updateSetting({ [key]: value });
        });
    }
    setting.appendChild(settingInput);
    setting.appendChild(settingDescription);
    return setting;
}

function displaySettings() {
    chrome.storage.local.get("settings", storage => {
        const settingsContainer = document.querySelector(".paster-settings-container");
        document.querySelector(".paster-header").textContent = "Settings";
        settingsContainer.textContent = "";

        const keys = Object.keys(storage["settings"]);
        keys.forEach(key => settingsContainer.appendChild(createSetting(key, storage["settings"][key])));

        showTab(".paster-settings-container");
    });
}

function showTab(tab) {
    [".paster-settings-container", ".paster-create-container", ".paster-settings-container", ".paster-saved-container"].forEach(t => {
        document.querySelector(t).style.display = "none";
    });
    document.querySelector(tab).style.display = "block";
}

function updateSetting(update) {
    chrome.storage.local.get("settings", storage => {
        return chrome.storage.local.set({ "settings": { ...storage["settings"], ...update } });
    })
}

function el(type, className, textContent) {
    let x = document.createElement(type);
    if (className) x.className = className;
    if (textContent) x.textContent = textContent;
    return x;
}

run();