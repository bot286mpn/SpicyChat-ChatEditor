// ==UserScript==
// @name         SpicyChat - Chat Editor
// @name:ru      SpicyChat - Редактор чата
// @namespace    https://github.com/bot286mpn/SpicyChat-ChatEditor
// @version      1.0.0
// @description  Customize SpicyChat AI appearance: widths, heights, fonts, text alignment
// @description:ru Настройте внешний вид SpicyChat AI: ширины, высоты, шрифты, выравнивание текста
// @author       YourName
// @match        https://spicychat.ai/chat/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // Защита от повторного запуска
    if (document.getElementById('spicychat-editor-active')) return;
    document.body.insertAdjacentHTML('beforeend', '<div id="spicychat-editor-active" style="display:none;"></div>');

    let currentSettings = null;
    let styleElement = null;
    let isPanelOpen = false;
    let isScriptEnabled = true;
    let currentProfileName = null;
    let profiles = {};
    let hasUnsavedChanges = false;

    // ФИКСИРОВАННЫЕ ОРИГИНАЛЬНЫЕ ЗНАЧЕНИЯ
    const ORIGINAL_VALUES = {
        CHAT_WIDTH: 800,        // px
        INPUT_WIDTH: 800,       // px
        TEXTAREA_MIN_HEIGHT: 11, // px
        TEXTAREA_MAX_HEIGHT: 200, // px - максимальная высота textarea
        CONTAINER_HEIGHT: 44,   // px - высота всего контейнера
        FONT_SIZE: 100,         // %
        FONT_FAMILY: 'Inter, system-ui, sans-serif'
    };

    // Дефолтные настройки
    const DEFAULT_SETTINGS = {
        chatWidth: 100,
        inputWidth: 100,
        inputHeight: 100,
        messageAlign: 'left',
        fontSize: 100,
        fontFamily: ORIGINAL_VALUES.FONT_FAMILY
    };

    // Применить стили с правильными селекторами и выравниванием
    function applyStyles() {
        if (!currentSettings || !isScriptEnabled) {
            if (styleElement) {
                styleElement.textContent = '';
            }
            return;
        }

        let css = '';
        console.log('Applying styles with settings:', currentSettings);

        // Ширина чата - расчет от фиксированного значения
        const newChatWidth = (ORIGINAL_VALUES.CHAT_WIDTH * currentSettings.chatWidth) / 100;

        css += `.w-full.flex.mb-lg.bg-transparent[style*="max-width: 800px"] {
            max-width: ${newChatWidth}px !important;
        }\n`;

        css += `.mb-lg.bg-transparent > div.flex.flex-col.gap-md.w-full {
            max-width: 100% !important;
            width: 100% !important;
        }\n`;

        // Ширина поля ввода - расчет от фиксированного значения
        const newInputWidth = (ORIGINAL_VALUES.INPUT_WIDTH * currentSettings.inputWidth) / 100;

        css += `.flex.justify-undefined.items-undefined.bg-transparent.w-full.right-0.pb-md.z-\\[1\\][style*="max-width: 800px"] {
            max-width: ${newInputWidth}px !important;
        }\n`;

        // ВЫСОТА ПОЛЯ ВВОДА - ТЕПЕРЬ В ПРОЦЕНТАХ
        if (currentSettings.inputHeight !== 100) {
            const heightMultiplier = currentSettings.inputHeight / 100;
            const newTextareaMinHeight = ORIGINAL_VALUES.TEXTAREA_MIN_HEIGHT * heightMultiplier;
            const newTextareaMaxHeight = ORIGINAL_VALUES.TEXTAREA_MAX_HEIGHT * heightMultiplier;
            const newContainerHeight = ORIGINAL_VALUES.CONTAINER_HEIGHT * heightMultiplier;

            // Основной textarea - ГЛАВНЫЙ ЭЛЕМЕНТ ДЛЯ ИЗМЕНЕНИЯ
            css += `textarea {
                min-height: ${newTextareaMinHeight}px !important;
                max-height: ${newTextareaMaxHeight}px !important;
                height: auto !important;
                align-self: flex-start !important;
                margin-top: 0 !important;
            }\n`;

            // Контейнер textarea (div с классами flex-grow max-h-[188px])
            css += `.flex-grow.max-h-\\[188px\\] {
                max-height: ${newTextareaMaxHeight}px !important;
                align-items: flex-start !important;
            }\n`;

            // Основной контейнер поля ввода
            css += `.w-full.border-1.border-solid.rounded-\\[13px\\].bg-gray-3 {
                min-height: ${newContainerHeight}px !important;
            }\n`;

            // Внутренний контейнер с кнопками - ИСПРАВЛЯЕМ ВЫРАВНИВАНИЕ
            css += `.flex.justify-between.items-end.py-sm.px-1.gap-0 {
                min-height: ${newContainerHeight - 16}px !important;
                align-items: flex-start !important;
            }\n`;

            // Контейнер с textarea и кнопками - ИСПРАВЛЯЕМ ВЫРАВНИВАНИЕ
            css += `.flex.flex-1.items-end.gap-1 {
                min-height: ${newTextareaMinHeight}px !important;
                align-items: flex-start !important;
            }\n`;

            // Дополнительные стили для правильного выравнивания
            css += `.flex.items-center.justify-center {
                align-items: flex-start !important;
            }\n`;

            // Исправляем выравнивание placeholder'а
            css += `textarea::placeholder {
                line-height: normal !important;
            }\n`;

        } else {
            // При 100% - возвращаем оригинальные стили
            css += `textarea {
                min-height: ${ORIGINAL_VALUES.TEXTAREA_MIN_HEIGHT}px !important;
                max-height: ${ORIGINAL_VALUES.TEXTAREA_MAX_HEIGHT}px !important;
                height: auto !important;
            }\n`;
            css += `.flex-grow.max-h-\\[188px\\] {
                max-height: ${ORIGINAL_VALUES.TEXTAREA_MAX_HEIGHT}px !important;
            }\n`;
            css += `.w-full.border-1.border-solid.rounded-\\[13px\\].bg-gray-3 {
                min-height: ${ORIGINAL_VALUES.CONTAINER_HEIGHT}px !important;
            }\n`;
        }

        // Стили для текста сообщений - ИСПРАВЛЕН КУРСИВ
        const textAlign = currentSettings.messageAlign === 'center' ? 'center' :
                         currentSettings.messageAlign === 'right' ? 'right' : 'left';

        // Базовый размер шрифта в пикселях (оригинальный размер)
        const baseFontSize = 16;

        // Рассчитываем новый размер шрифта
        const newFontSize = baseFontSize * (currentSettings.fontSize / 100);

        // ОБЩИЙ СТИЛЬ ДЛЯ ВСЕГО ТЕКСТА
        css += `div.mb-lg.bg-transparent span.leading-6,
                div.mb-lg.bg-transparent em,
                div.mb-lg.bg-transparent i,
                div.mb-lg.bg-transparent strong,
                div.mb-lg.bg-transparent b,
                div.mb-lg.bg-transparent u {
            font-size: ${newFontSize}px !important;
            font-family: ${currentSettings.fontFamily} !important;
            line-height: 1.5 !important;
        }\n`;

        // ДОПОЛНИТЕЛЬНЫЕ СТИЛИ ДЛЯ КУРСИВА - убираем все возможные влияния
        css += `div.mb-lg.bg-transparent em,
                div.mb-lg.bg-transparent i {
            font-style: italic !important;
            transform: none !important;
            scale: 1 !important;
            zoom: 1 !important;
            max-width: none !important;
            width: auto !important;
            transition: none !important;
            animation: none !important;
            display: inline !important;
            vertical-align: baseline !important;
        }\n`;

        // Специально для span внутри курсива (на случай вложенности)
        css += `div.mb-lg.bg-transparent em span,
                div.mb-lg.bg-transparent i span,
                div.mb-lg.bg-transparent em *,
                div.mb-lg.bg-transparent i * {
            font-size: inherit !important;
            transform: none !important;
            scale: 1 !important;
        }\n`;

        // Выравнивание текста
        css += `div.mb-lg.bg-transparent span.leading-6,
               div.mb-lg.bg-transparent em,
               div.mb-lg.bg-transparent i,
               div.mb-lg.bg-transparent strong,
               div.mb-lg.bg-transparent b,
               div.mb-lg.bg-transparent u {
            text-align: ${textAlign} !important;
        }\n`;

        // Удаление надписи
        css += `div.flex.flex-col.justify-center.items-center.gap-sm > p.text-label-md.font-regular.text-left.text-gray-11 {
            display: none !important;
        }\n`;

        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'spicychat-custom-styles';
            document.head.appendChild(styleElement);
        }
        styleElement.textContent = css;
    }

    // === UI Функции ===
    const systemFonts = [
        ORIGINAL_VALUES.FONT_FAMILY,
        'Arial, sans-serif',
        'Verdana, sans-serif',
        'Tahoma, sans-serif',
        'Trebuchet MS, sans-serif',
        'Times New Roman, serif',
        'Georgia, serif',
        'Garamond, serif',
        'Courier New, monospace',
        'Impact, sans-serif',
        'Comic Sans MS, cursive',
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    ];

    function saveProfiles() {
        try {
            GM_setValue('spicychat_profiles', JSON.stringify(profiles));
            GM_setValue('spicychat_current_profile', currentProfileName);
            GM_setValue('spicychat_script_enabled', isScriptEnabled);
        } catch (error) {
            console.error('SpicyChat Editor: Error saving profiles', error);
        }
    }

    function loadProfiles() {
        try {
            const savedProfiles = GM_getValue('spicychat_profiles', null);
            profiles = savedProfiles ? JSON.parse(savedProfiles) : {};

            // ИСПРАВЛЕНИЕ: проверяем и исправляем некорректные значения высоты
            Object.keys(profiles).forEach(profileName => {
                if (profiles[profileName].inputHeight < 100) {
                    profiles[profileName].inputHeight = 100;
                }
            });

            if (Object.keys(profiles).length === 0) {
                profiles['Оригинальные настройки'] = {...DEFAULT_SETTINGS};
                profiles['Мой профиль'] = {...DEFAULT_SETTINGS};
            }

            currentProfileName = GM_getValue('spicychat_current_profile', 'Профиль не выбран');
            isScriptEnabled = GM_getValue('spicychat_script_enabled', true);

            // Если выбран реальный профиль - загружаем его настройки
            if (currentProfileName !== 'Профиль не выбран' && profiles[currentProfileName]) {
                currentSettings = {...profiles[currentProfileName]};

                // Дополнительная проверка текущих настроек
                if (currentSettings.inputHeight < 100) {
                    currentSettings.inputHeight = 100;
                }
            } else {
                // Если "Профиль не выбран" - используем настройки по умолчанию
                currentSettings = {...DEFAULT_SETTINGS};
            }
        } catch (error) {
            console.error('SpicyChat Editor: Error loading profiles', error);
            profiles = {
                'Оригинальные настройки': {...DEFAULT_SETTINGS},
                'Мой профиль': {...DEFAULT_SETTINGS}
            };
            currentProfileName = 'Профиль не выбран';
            currentSettings = {...DEFAULT_SETTINGS};
            isScriptEnabled = true;
        }
    }

    function createButton() {
        const btn = document.createElement('div');
        btn.id = 'spicychat-editor-button';
        btn.innerHTML = isScriptEnabled ? '⚙️' : '🔴';
        btn.title = isScriptEnabled ? 'Настройки чата (включено)' : 'Настройки чата (выключено)';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            background: ${isScriptEnabled ? '#3182ce' : '#e53e3e'};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
            z-index: 10000;
            font-size: 18px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            transition: transform 0.2s, background 0.2s;
        `;

        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.1)';
            btn.style.background = isScriptEnabled ? '#2c5282' : '#c53030';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.background = isScriptEnabled ? '#3182ce' : '#e53e3e';
        });
        btn.addEventListener('click', togglePanel);

        document.body.appendChild(btn);
        return btn;
    }

    function updateButton() {
        const btn = document.getElementById('spicychat-editor-button');
        if (btn) {
            btn.innerHTML = isScriptEnabled ? '⚙️' : '🔴';
            btn.title = isScriptEnabled ? 'Настройки чата (включено)' : 'Настройки чата (выключено)';
            btn.style.background = isScriptEnabled ? '#3182ce' : '#e53e3e';
        }
    }

    function createPanel() {
        const panel = document.createElement('div');
        panel.id = 'spicychat-editor-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #2d3748;
            padding: 15px;
            border-radius: 8px;
            z-index: 9999;
            color: white;
            width: 400px;
            display: none;
            font-family: sans-serif;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            max-height: 85vh;
            overflow-y: auto;
        `;

        const createControl = (key, name, min, max, unit='%') => {
            const value = currentSettings[key];
            return `
                <div style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">${name}:</label>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <input type="range" id="slider-${key}" min="${min}" max="${max}" value="${value}" style="flex:1;">
                        <input type="number" id="input-${key}" value="${value}" min="${min}" max="${max}" style="width:70px;">
                        <span>${unit}</span>
                    </div>
                </div>
            `;
        };

        const createFontFamilyControl = () => {
            let options = systemFonts.map(font =>
                `<option value="${font}" ${currentSettings.fontFamily === font ? 'selected' : ''}>${font.split(',')[0]}</option>`
            ).join('');
            return `
                <div style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Семейство шрифтов:</label>
                    <select id="font-family" style="width:100%;padding:8px;border-radius:4px;background:#4a5568;color:white;border:1px solid #718096;">
                        ${options}
                    </select>
                </div>
            `;
        };

        const createProfilesControl = () => {
            let options = '<option value="Профиль не выбран"' + (currentProfileName === 'Профиль не выбран' ? ' selected' : '') + '>Профиль не выбран</option>';
            options += Object.keys(profiles).map(name =>
                `<option value="${name}" ${currentProfileName === name ? 'selected' : ''}>${name}</option>`
            ).join('');

            return `
                <div style="margin-bottom:15px;">
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Профиль настроек:</label>
                    <div style="display:flex; gap:5px; margin-bottom:10px;">
                        <select id="profile-select" style="flex:1;padding:8px;border-radius:4px;background:#4a5568;color:white;border:1px solid #718096;">
                            ${options}
                        </select>
                        <button id="btn-delete-profile" style="padding:8px 12px;background:#e53e3e;color:white;border:none;border-radius:4px;cursor:pointer;" title="Удалить профиль" ${currentProfileName === 'Профиль не выбран' ? 'disabled' : ''}>🗑️</button>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <input type="text" id="new-profile-name" placeholder="Название профиля" style="flex:1;padding:8px;border-radius:4px;background:#4a5568;color:white;border:1px solid #718096;">
                        <button id="btn-save-profile" style="padding:8px 12px;background:#48bb78;color:white;border:none;border-radius:4px;cursor:pointer;">💾</button>
                    </div>
                </div>
            `;
        };

        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="margin:0;">Настройки чата</h3>
                <div style="display:flex; align-items:center; gap:10px;">
                    <label style="font-size:12px; color:#a0aec0;">Скрипт:</label>
                    <label class="switch">
                        <input type="checkbox" id="script-toggle" ${isScriptEnabled ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                    <button id="btn-close" style="background:none; border:none; color:white; font-size:20px; cursor:pointer;">×</button>
                </div>
            </div>

            ${createProfilesControl()}

            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Ширина чата:</label>
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="range" id="slider-chatWidth" min="50" max="200" value="${currentSettings.chatWidth}" style="flex:1;">
                    <input type="number" id="input-chatWidth" value="${currentSettings.chatWidth}" min="50" max="200" style="width:70px;">
                    <span>%</span>
                </div>
                <small style="color:#a0aec0; font-size:12px;">Оригинал: ${ORIGINAL_VALUES.CHAT_WIDTH}px (100%)</small>
            </div>

            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Ширина поля ввода:</label>
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="range" id="slider-inputWidth" min="50" max="200" value="${currentSettings.inputWidth}" style="flex:1;">
                    <input type="number" id="input-inputWidth" value="${currentSettings.inputWidth}" min="50" max="200" style="width:70px;">
                    <span>%</span>
                </div>
                <small style="color:#a0aec0; font-size:12px;">Оригинал: ${ORIGINAL_VALUES.INPUT_WIDTH}px (100%)</small>
            </div>

            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Высота поля ввода:</label>
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="range" id="slider-inputHeight" min="100" max="500" value="${currentSettings.inputHeight}" style="flex:1;">
                    <input type="number" id="input-inputHeight" value="${currentSettings.inputHeight}" min="100" max="500" style="width:70px;">
                    <span>%</span>
                </div>
                <small style="color:#a0aec0; font-size:12px;">Оригинал: ${ORIGINAL_VALUES.TEXTAREA_MIN_HEIGHT}px - ${ORIGINAL_VALUES.TEXTAREA_MAX_HEIGHT}px (100%)</small>
            </div>

            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Выравнивание текста сообщений:</label>
                <select id="message-align" style="width:100%;padding:8px;border-radius:4px;background:#4a5568;color:white;border:1px solid #718096;">
                    <option value="left" ${currentSettings.messageAlign === 'left' ? 'selected' : ''}>По левому краю</option>
                    <option value="center" ${currentSettings.messageAlign === 'center' ? 'selected' : ''}>По центру</option>
                    <option value="right" ${currentSettings.messageAlign === 'right' ? 'selected' : ''}>По правому краю</option>
                </select>
            </div>

            <h3 style="margin:20px 0 15px 0;">Настройки шрифта</h3>

            <div style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Размер шрифта:</label>
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="range" id="slider-fontSize" min="50" max="200" value="${currentSettings.fontSize}" style="flex:1;">
                    <input type="number" id="input-fontSize" value="${currentSettings.fontSize}" min="50" max="200" style="width:70px;">
                    <span>%</span>
                </div>
                <small style="color:#a0aec0; font-size:12px;">Оригинал: 100% (максимум: 200%)</small>
            </div>

            ${createFontFamilyControl()}

            <div style="display:flex; gap:10px; margin-top:20px;">
                <button id="btn-apply" style="flex:1;background:#3182ce;color:white;padding:10px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Применить</button>
                <button id="btn-reset" style="flex:1;background:#fc8181;color:white;padding:10px;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Сбросить</button>
            </div>
        `;

        const switchStyles = `
            .switch {
                position: relative;
                display: inline-block;
                width: 50px;
                height: 24px;
            }
            .switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            .slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #e53e3e;
                transition: .4s;
                border-radius: 24px;
            }
            .slider:before {
                position: absolute;
                content: "";
                height: 16px;
                width: 16px;
                left: 4px;
                bottom: 4px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            }
            input:checked + .slider {
                background-color: #48bb78;
            }
            input:checked + .slider:before {
                transform: translateX(26px);
            }
        `;

        const style = document.createElement('style');
        style.textContent = switchStyles;
        panel.appendChild(style);

        document.body.appendChild(panel);
        setupPanelHandlers(panel);
    }

    function setupPanelHandlers(panel) {
        // Обработчики для всех слайдеров
        function setupSliderHandlers(key, unit = '%') {
            const slider = panel.querySelector(`#slider-${key}`);
            const input = panel.querySelector(`#input-${key}`);

            const updateValue = (val) => {
                const numVal = parseInt(val);
                if (!isNaN(numVal)) {
                    if (key === 'inputHeight' && numVal < 100) {
                        numVal = 100;
                    }
                    currentSettings[key] = numVal;
                    slider.value = numVal;
                    input.value = numVal;

                    // 1) При движении ползунков временно применяем стили
                    if (isScriptEnabled) {
                        applyStyles();
                        hasUnsavedChanges = true;
                    }
                }
            };

            slider.addEventListener('input', (e) => updateValue(e.target.value));
            input.addEventListener('input', (e) => updateValue(e.target.value));
        }

        ['chatWidth', 'inputWidth', 'inputHeight', 'fontSize'].forEach(key => setupSliderHandlers(key));

        // Выравнивание текста
        const messageAlign = panel.querySelector('#message-align');
        messageAlign.addEventListener('change', (e) => {
            currentSettings.messageAlign = e.target.value;
            if (isScriptEnabled) {
                applyStyles();
                hasUnsavedChanges = true;
            }
        });

        // Шрифт
        const fontFamily = panel.querySelector('#font-family');
        fontFamily.addEventListener('change', (e) => {
            currentSettings.fontFamily = e.target.value;
            if (isScriptEnabled) {
                applyStyles();
                hasUnsavedChanges = true;
            }
        });

        // Переключатель скрипта
        const scriptToggle = panel.querySelector('#script-toggle');
        scriptToggle.addEventListener('change', (e) => {
            isScriptEnabled = e.target.checked;
            updateButton();
            if (isScriptEnabled && hasUnsavedChanges) {
                applyStyles();
            } else if (!isScriptEnabled) {
                if (styleElement) {
                    styleElement.textContent = '';
                }
            }
            saveProfiles();
            showNotification(isScriptEnabled ? 'Скрипт включен' : 'Скрипт выключен', isScriptEnabled ? 'success' : 'info');
        });

        // Управление профилями
        const profileSelect = panel.querySelector('#profile-select');
        profileSelect.addEventListener('change', (e) => {
            const profileName = e.target.value;

            // 3) При сохранении настроек в профиль или выборе сохраненного профиля, черновик удаляется
            hasUnsavedChanges = false;

            currentProfileName = profileName;

            if (profileName === 'Профиль не выбран') {
                // Отключаем стили
                if (styleElement) {
                    styleElement.textContent = '';
                }
                currentSettings = {...DEFAULT_SETTINGS};
                // Обновляем кнопку удаления профиля
                const btnDeleteProfile = panel.querySelector('#btn-delete-profile');
                if (btnDeleteProfile) {
                    btnDeleteProfile.disabled = true;
                }
            } else {
                // Загружаем настройки профиля
                if (profiles[profileName]) {
                    currentSettings = {...profiles[profileName]};

                    if (currentSettings.inputHeight < 100) {
                        currentSettings.inputHeight = 100;
                    }

                    // Обновляем кнопку удаления профиля
                    const btnDeleteProfile = panel.querySelector('#btn-delete-profile');
                    if (btnDeleteProfile) {
                        btnDeleteProfile.disabled = false;
                    }

                    if (isScriptEnabled) {
                        applyStyles();
                    }
                }
            }
            updatePanelUI();
            saveProfiles();
        });

        const btnDeleteProfile = panel.querySelector('#btn-delete-profile');
        btnDeleteProfile.addEventListener('click', () => {
            if (currentProfileName === 'Профиль не выбран') return;

            if (confirm(`Удалить профиль "${currentProfileName}"?`)) {
                delete profiles[currentProfileName];
                // Переключаемся на "Профиль не выбран"
                currentProfileName = 'Профиль не выбран';
                currentSettings = {...DEFAULT_SETTINGS};
                updatePanelUI();
                // Отключаем стили
                if (styleElement) {
                    styleElement.textContent = '';
                }
                saveProfiles();
                showNotification('Профиль удален', 'info');
            }
        });

        const btnSaveProfile = panel.querySelector('#btn-save-profile');
        const newProfileName = panel.querySelector('#new-profile-name');
        btnSaveProfile.addEventListener('click', () => {
            const name = newProfileName.value.trim();
            if (!name) {
                showNotification('Введите название профиля', 'error');
                return;
            }
            profiles[name] = {...currentSettings};
            currentProfileName = name;
            newProfileName.value = '';
            // 3) Черновик удаляется при сохранении профиля
            hasUnsavedChanges = false;
            updatePanelUI();
            saveProfiles();
            showNotification(`Профиль "${name}" сохранен`, 'success');
        });

        // Кнопка "Применить"
        panel.querySelector('#btn-apply').addEventListener('click', () => {
            const profileNameInput = panel.querySelector('#new-profile-name');
            const profileName = profileNameInput.value.trim();

            if (profileName) {
                // Сохраняем как новый профиль
                profiles[profileName] = {...currentSettings};
                currentProfileName = profileName;
                profileNameInput.value = '';
                // 2) При нажатии кнопки применить стиль сохраняется как Черновик
                hasUnsavedChanges = true;
                updatePanelUI();
                saveProfiles();
                showNotification(`Профиль "${profileName}" сохранен и применен!`, 'success');
            } else {
                // 2) При нажатии кнопки применить стиль сохраняется как Черновик
                hasUnsavedChanges = true;
                if (isScriptEnabled) {
                    applyStyles();
                }
                showNotification('Настройки применены (черновик)!', 'success');
            }
        });

        // Кнопка "Сбросить"
        panel.querySelector('#btn-reset').addEventListener('click', () => {
            if (confirm('Сбросить настройки к оригинальным?')) {
                // 4) При нажатии кнопки Сброс, черновик просто удаляется
                hasUnsavedChanges = false;
                currentSettings = {...DEFAULT_SETTINGS};
                currentProfileName = 'Профиль не выбран';
                updatePanelUI();
                // Отключаем стили
                if (styleElement) {
                    styleElement.textContent = '';
                }
                saveProfiles();
                showNotification('Настройки сброшены!', 'info');
            }
        });

        panel.querySelector('#btn-close').addEventListener('click', togglePanel);
    }

    function updatePanelUI() {
        if (!isPanelOpen) return;

        const panel = document.getElementById('spicychat-editor-panel');
        if (!panel) return;

        ['chatWidth', 'inputWidth', 'inputHeight', 'fontSize'].forEach(key => {
            const val = currentSettings[key];
            const slider = panel.querySelector(`#slider-${key}`);
            const input = panel.querySelector(`#input-${key}`);
            if (slider) slider.value = val;
            if (input) input.value = val;
        });

        const messageAlign = panel.querySelector('#message-align');
        if (messageAlign) messageAlign.value = currentSettings.messageAlign;

        const fontFamily = panel.querySelector('#font-family');
        if (fontFamily) fontFamily.value = currentSettings.fontFamily;

        const scriptToggle = panel.querySelector('#script-toggle');
        if (scriptToggle) scriptToggle.checked = isScriptEnabled;

        // Обновляем список профилей и кнопку удаления
        const profileSelect = panel.querySelector('#profile-select');
        if (profileSelect) {
            let options = '<option value="Профиль не выбран"' + (currentProfileName === 'Профиль не выбран' ? ' selected' : '') + '>Профиль не выбран</option>';
            options += Object.keys(profiles).map(name =>
                `<option value="${name}" ${currentProfileName === name ? 'selected' : ''}>${name}</option>`
            ).join('');
            profileSelect.innerHTML = options;
        }

        const btnDeleteProfile = panel.querySelector('#btn-delete-profile');
        if (btnDeleteProfile) {
            btnDeleteProfile.disabled = currentProfileName === 'Профиль не выбран';
        }
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#fc8181' : '#3182ce'};
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 10001;
            font-weight: bold;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2000);
    }

    function togglePanel() {
        const panel = document.getElementById('spicychat-editor-panel');

        if (!isPanelOpen) {
            if (!panel) createPanel();
            panel.style.display = 'block';
            updatePanelUI();
        } else {
            if (panel) panel.style.display = 'none';
        }
        isPanelOpen = !isPanelOpen;
    }

    // Закрытие панели при клике вне ее
    document.addEventListener('click', function(event) {
        const panel = document.getElementById('spicychat-editor-panel');
        const button = document.getElementById('spicychat-editor-button');

        if (isPanelOpen && panel && !panel.contains(event.target) &&
            button && !button.contains(event.target)) {
            togglePanel();
        }
    });

    // Запуск
    function init() {
        loadProfiles();
        createButton();
        // Применяем стили только если есть активный профиль
        if (currentProfileName !== 'Профиль не выбран' && isScriptEnabled) {
            applyStyles();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();