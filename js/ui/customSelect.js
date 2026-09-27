import { getIcon } from "./../icons.js?v=5.1";

/**
 * Universal Luxury Custom Dropdown Component
 * Replaces native browser <select> with a sleek dark-luxury UI
 * while maintaining 100% synchronization with the underlying <select>.
 */

export function enhanceSelect(selectEl) {
  if (!selectEl || selectEl.dataset.customSelectInit) return;
  selectEl.dataset.customSelectInit = "true";

  // Hide the native select visually but keep it accessible for form access
  selectEl.classList.add("native-select-hidden");

  // Create wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "custom-select-wrapper";
  if (selectEl.id) wrapper.dataset.for = selectEl.id;
  if (selectEl.style.width) wrapper.style.width = selectEl.style.width;

  // Insert wrapper right before selectEl, then move selectEl inside wrapper
  selectEl.parentNode.insertBefore(wrapper, selectEl);
  wrapper.appendChild(selectEl);

  // Trigger button
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "custom-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const valueLabel = document.createElement("span");
  valueLabel.className = "custom-select-value";

  const arrow = document.createElement("span");
  arrow.className = "custom-select-arrow";
  arrow.innerHTML = getIcon("CHEVRON_DOWN");

  trigger.appendChild(valueLabel);
  trigger.appendChild(arrow);
  wrapper.appendChild(trigger);

  // Dropdown menu
  const menu = document.createElement("div");
  menu.className = "custom-select-menu";
  menu.setAttribute("role", "listbox");
  wrapper.appendChild(menu);

  function formatOptionContent(text) {
    // Check if text has parenthetical details e.g. "Title (Details)"
    const match = text.match(/^(.*?)\s*\((.*?)\)$/);
    if (match && match[2].length > 15) {
      return `
        <div class="custom-select-option-content">
          <span class="custom-select-option-title">${match[1].trim()}</span>
          <span class="custom-select-option-desc">${match[2].trim()}</span>
        </div>
      `;
    }
    return `<span class="custom-select-option-title">${text}</span>`;
  }

  function getShortTriggerText(text) {
    const match = text.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      const main = match[1].trim();
      const sub = match[2].split("-")[0].split("?")[0].trim();
      if (sub && sub.length < 24) {
        return `${main} (${sub})`;
      }
      return main;
    }
    return text;
  }

  function renderOptions() {
    menu.innerHTML = "";
    const options = Array.from(selectEl.options);
    const selectedOption = selectEl.options[selectEl.selectedIndex] || options[0];

    if (selectedOption) {
      valueLabel.innerHTML = `<span class="trigger-label">${getShortTriggerText(selectedOption.text)}</span>`;
    }

    options.forEach((opt, idx) => {
      const isSelected = opt.value === selectEl.value;
      const optEl = document.createElement("div");
      optEl.className = `custom-select-option ${isSelected ? "selected" : ""}`;
      optEl.setAttribute("role", "option");
      optEl.setAttribute("aria-selected", isSelected ? "true" : "false");
      optEl.dataset.value = opt.value;

      optEl.innerHTML = `
        ${formatOptionContent(opt.text)}
        <span class="custom-select-check">${isSelected ? getIcon("CHECK") : ""}</span>
      `;

      optEl.onclick = (e) => {
        e.stopPropagation();
        if (selectEl.value !== opt.value) {
          selectEl.value = opt.value;
          selectEl.dispatchEvent(new Event("change", { bubbles: true }));
          selectEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
        closeMenu();
        syncSelected();
      };

      menu.appendChild(optEl);
    });
  }

  function syncSelected() {
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    if (selectedOption) {
      valueLabel.innerHTML = `<span class="trigger-label">${getShortTriggerText(selectedOption.text)}</span>`;
    }
    menu.querySelectorAll(".custom-select-option").forEach((optEl) => {
      const isSelected = optEl.dataset.value === selectEl.value;
      optEl.classList.toggle("selected", isSelected);
      optEl.setAttribute("aria-selected", isSelected ? "true" : "false");
      const checkEl = optEl.querySelector(".custom-select-check");
      if (checkEl) checkEl.innerHTML = isSelected ? getIcon("CHECK") : "";
    });
  }

  function openMenu() {
    closeAllCustomSelects();
    wrapper.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");

    // Adjust position if close to bottom of viewport or modal
    const rect = wrapper.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 250 && rect.top > 250) {
      wrapper.classList.add("open-upward");
    } else {
      wrapper.classList.remove("open-upward");
    }

    const selected = menu.querySelector(".custom-select-option.selected");
    if (selected) {
      selected.scrollIntoView({ block: "nearest" });
    }
  }

  function closeMenu() {
    wrapper.classList.remove("open", "open-upward");
    trigger.setAttribute("aria-expanded", "false");
  }

  trigger.onclick = (e) => {
    e.stopPropagation();
    if (wrapper.classList.contains("open")) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  // Keyboard navigation
  trigger.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      openMenu();
    } else if (e.key === "Escape") {
      closeMenu();
    }
  };

  selectEl.addEventListener("change", syncSelected);
  renderOptions();

  // Expose sync helper
  wrapper._sync = () => {
    renderOptions();
    syncSelected();
  };
}

export function closeAllCustomSelects() {
  document.querySelectorAll(".custom-select-wrapper.open").forEach((w) => {
    w.classList.remove("open", "open-upward");
    const trig = w.querySelector(".custom-select-trigger");
    if (trig) trig.setAttribute("aria-expanded", "false");
  });
}

// Global click outside listener
if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".custom-select-wrapper")) {
      closeAllCustomSelects();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAllCustomSelects();
    }
  });
}

export function initCustomSelects(container = document) {
  if (!container) return;
  const selects = container.querySelectorAll("select.select-ctrl, select#boardEditionSelect, select#aiDifficultySelect, select#playerCountSelect");
  selects.forEach((sel) => enhanceSelect(sel));
}
