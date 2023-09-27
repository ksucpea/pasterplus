
let currentInput = null;
let currentPos = -1;
let currentGroup = "Custom";
let lastX = 0;
let lastY = 0;

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

chrome.storage.onChanged.addListener((changes, namespace) => {
    let open = changes["open"] || null;
    if (open) open.newValue === true ? run() : close();
});

function run() {
    let paster = document.querySelector(".paster-container");
    if (paster) {
        paster.style.display = "flex";
        return;
    }

    chrome.storage.local.get(["position", "current_group", "open"], storage => {

        if (storage["open"] !== true) return;

        currentGroup = storage["current_group"];

        const container = el("div", "paster-container", null);
        document.body.appendChild(container);
        if (storage["position"]) {
            console.log(parseInt(storage["position"][0]), parseInt(storage["position"][1]), window.innerWidth - 400, window.innerHeight - 200);
            container.style.left = parseInt(storage["position"][0]) > window.innerWidth - 400 ? (window.innerWidth - 400) + "px" : storage["position"][0];
            container.style.top = parseInt(storage["position"][1]) > window.innerHeight - 300 ? (window.innerHeight - 300) + "px" : storage["position"][1];
        }

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

        const header = el("h2", "paster-header", "Better Paster");
        rightSide.appendChild(header);

        const savedContainer = el("div", "paster-saved-container", null);
        rightSide.appendChild(savedContainer);

        const savedBtns = el("div", "paster-saved-btns", null);
        savedContainer.appendChild(savedBtns);

        const createContainer = el("div", "paster-create-container", null);
        rightSide.appendChild(createContainer);

        displayGroup(currentGroup);

        document.body.addEventListener("click", function (e) {
            if (!e.target.className.includes("paster-")) {
                currentPos = e.target.selectionStart || e.target.selectionEnd || -1;
                currentInput = e.target;
                let selection = window.getSelection();
                if (selection && selection.toString() !== "") {
                    document.querySelector(".paster-add-input").value = selection;
                }
            }
        });

        document.body.addEventListener("mousedown", (e) => {
            if (e.target.className.includes("paster-") && !e.target.className.includes("paster-add-input")) {
                lastX = e.clientX;
                lastY = e.clientY;
                document.addEventListener("mouseup", stopDrag);
                document.addEventListener("mousemove", drag);
            }
        });

    });
}

function displayGroup(group) {
    currentGroup = group;
    const groupsContainer = document.querySelector(".paster-groups");

    chrome.storage.local.get("saved", storage => {

        let keys = Object.keys(storage["saved"]);
        for (i = 0; i < keys.length; i++) {
            const key = keys[i];
            let groupSelect = el("li", "paster-group", key);
            groupSelect.addEventListener("click", () => {
                displayGroup(key);
            });
            if (keys[i] === currentGroup) groupSelect.classList.add("paster-active");
            keys[i] = groupSelect;
        }

        groupsContainer.textContent = "";
        keys.forEach(x => {
            groupsContainer.appendChild(x);
        });

        chrome.storage.local.set({ "current_group": group });
        refreshSaved(group);
    });

}

function refreshSaved(group) {
    const savedContainer = document.querySelector(".paster-saved-container");
    const savedBtns = document.querySelector(".paster-saved-btns");

    chrome.storage.local.get("saved", storage => {
        document.querySelector(".paster-header").textContent = "Better Paster";

        let els = [];

        for (i = 0; i < storage["saved"][group].length; i++) {
            const save = storage["saved"][group][i];
            let copySave = el("div", "paster-saved-btn", save);
            copySave.addEventListener("click", () => {
                navigator.clipboard.writeText(save);
                document.querySelector(".paster-add-input").value = save;
            });
            let removeBtn = el("button", "paster-remove-btn", "x");
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
            addBtn = el("button", "paster-add-btn", "+ Add");
            addBtn.addEventListener("click", () => {
                chrome.storage.local.get("saved", (_storage) => {
                    console.log(_storage["saved"], currentGroup, _storage["saved"][currentGroup]);
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

        // no flicker (?)
        savedBtns.textContent = "";
        els.forEach(el => savedBtns.appendChild(el));
        savedContainer.appendChild(addInput);
        savedContainer.appendChild(btns);
        savedContainer.style.display = "block";
        document.querySelector(".paster-create-container").style.display = "none";
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
    const rightSide = document.querySelector(".paster-main");
    const createContainer = document.querySelector(".paster-create-container");
    createContainer.textContent = "";

    let backBtn = el("button", "paster-back-btn", "< Back");
    backBtn.addEventListener("click", () => {
        document.querySelector(".paster-header").textContent = "Better Paster";
        document.querySelector(".paster-saved-container").style.display = "block";
        createContainer.style.display = "none";
    });
    createContainer.appendChild(backBtn);

    let groupInput = el("input", "paster-group-input");
    createContainer.appendChild(groupInput);

    let groupAddBtn = el("button", "paster-group-add", "Create");
    groupAddBtn.addEventListener("click", () => {
        if (groupInput.value !== "") {
            chrome.storage.local.get("saved", storage => {
                chrome.storage.local.set({ "saved": { ...storage["saved"], [groupInput.value]: [] } }).then(() => displayGroup(groupInput.value));
            })
        }
    });

    let groupDelBtn = el("button", "paster-group-del", "Delete");
    groupDelBtn.addEventListener("click", () => {
        const val = groupInput.value;
        if (val !== "") {
            chrome.storage.local.get("saved", storage => {
                if (val in storage["saved"]) {
                    delete storage["saved"][val];
                    let keys = Object.keys(storage["saved"]);
                    console.log(storage["saved"], keys);
                    if (keys.length >= 1) {
                        chrome.storage.local.set({ "saved": storage["saved"] }).then(() => displayGroup(keys[0]));
                    }
                }
            });
        }
    });

    let btnContainer = el("div", "paster-btn-container", null);
    btnContainer.appendChild(groupAddBtn);
    btnContainer.appendChild(groupDelBtn);
    createContainer.appendChild(btnContainer);

    document.querySelector(".paster-header").textContent = "New group";
    createContainer.style.display = "block";
    rightSide.querySelector(".paster-saved-container").style.display = "none";
}

function el(type, className, textContent) {
    let x = document.createElement(type);
    if (className) x.className = className;
    if (textContent) x.textContent = textContent;
    return x;
}

run();