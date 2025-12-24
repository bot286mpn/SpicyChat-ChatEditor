// ==UserScript==
// @name         SpicyChat - Chat Editor
// @name:ru      SpicyChat - Редактор чата  
// @namespace    https://github.com/bot286mpn/SpicyChat-ChatEditor
// @version      2.0.0
// @description  Major update: Advanced font system, visual customization, profile management, draggable modals, hotkeys, and more
// @description:ru  Крупное обновление: Продвинутая система шрифтов, визуальные настройки, управление профилями, перетаскиваемые окна, горячие клавиши и многое другое
// @author       YourName
// @match        https://spicychat.ai/chat/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      catbox.moe
// @connect      fonts.googleapis.com
// @connect      fonts.gstatic.com
// @connect      www.googleapis.com
// @license      MIT
// ==/UserScript==


(function () {
    'use strict';

    // --- Глобальные переменные ---
    let currentSettings = null;
    let styleElement = null;
    let fontLinkElement = null;
    let isPanelOpen = false;
    let currentProfileName = null;
    let profiles = {};
    let observer = null;
    let lastUrl = window.location.href;
    let hideButtonTimeout = null;
    let favoriteFonts = [];
    let globalTemplates = [];
    let compactMode = false;
    let modalPositions = {};

    // Шрифты
    let systemFonts = [];
    let googleFonts = [];
    let currentFontPage = 0;
    let currentFontSource = 'system';
    let currentFontFilter = 'all';
    let currentFontSearch = '';
    let selectedFontForPreview = null;
    const FONTS_PER_PAGE = 30;

    // Примеры текста
    const SAMPLE_TEXTS = {
        'all': 'The quick brown fox jumps over the lazy dog\nСъешь ещё этих мягких французских булок\n0123456789',
        'latin': 'The quick brown fox jumps over the lazy dog.\nABCDEFGHIJKLMNOPQRSTUVWXYZ\nabcdefghijklmnopqrstuvwxyz\n0123456789',
        'cyrillic': 'Съешь ещё этих мягких французских булок, да выпей чаю.\nАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ\nабвгдеёжзийклмнопрстуфхцчшщъыьэюя\n0123456789',
        'greek': 'Ταχίστη αλώπηξ βαφής ψημένη γη, δρασκελίζει υπέρ νωθρού κυνός.\n0123456789',
        'arabic': 'نص حكيم له سر قاطع وذو شأن عظيم مكتوب على ثوب أخضر ومغلف بجلد أزرق.\n٠١٢٣٤٥٦٧٨٩',
        'hebrew': 'דג סקרן שט בים מאוכזב ולפתע מצא חברה.\n0123456789',
        'vietnamese': 'Con chó nâu nhanh nhẹn nhảy qua con chó lười biếng.\n0123456789',
        'chinese-simplified': '千字文：天地玄黄，宇宙洪荒\n0123456789',
        'japanese': 'いろはにほへと ちりぬるを\n漢字例文：日本語のサンプルテキスト\n0123456789',
        'korean': '다람쥐 헌 쳇바퀴에 타고파\n가나다라마바사아자차카타파하\n0123456789',
        'sans-serif': 'The quick brown fox jumps over the lazy dog\n0123456789',
        'serif': 'The quick brown fox jumps over the lazy dog\n0123456789',
        'monospace': 'The quick brown fox jumps over the lazy dog\n0123456789',
        'cursive': 'The quick brown fox jumps over the lazy dog\n0123456789'
    };

    const ORIGINAL_VALUES = {
        CHAT_WIDTH: 800,
        INPUT_WIDTH: 800,
        TEXTAREA_MIN_HEIGHT: 44,
        TEXTAREA_MAX_HEIGHT: 200,
        CONTAINER_HEIGHT: 56,
        FONT_SIZE: 100,
        FONT_FAMILY: 'Inter, system-ui, sans-serif'
    };

    const DEFAULT_SETTINGS = {
        chatWidth: 100,
        inputWidth: 100,
        inputHeight: 100,
        chatOpacity: 95,
        blurAmount: 0,
        bubbleRadius: 13,
        headerAvatarSize: 'normal',
        fontSize: 100,
        messageAlign: 'left',
        fontFamily: 'Inter',
        isGoogleFont: false,
        customFontName: '',
        textShadow: false,
        backgroundImage: '',
        useAvatarAsBackground: false,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        useCustomColors: false,
        botMsgColor: '#374151',
        botTextColor: '#ffffff',
        botItalicColor: '#9ca3af',
        userMsgColor: '#2563eb',
        userTextColor: '#ffffff',
        userItalicColor: '#bfdbfe',
        inputBgColor: '#374151',
        cinemaMode: false,
        googleFontsApiKey: '',
        backgroundBrightness: 100,
        backgroundContrast: 100,
        backgroundSaturation: 100,
        useGradient: false,
        botMsgColor2: '#1f2937',
        userMsgColor2: '#1e40af',
        gradientAngle: 90,
        templates: []
    };

    function safeEncode(str) { try { return encodeURIComponent(str); } catch (e) { return str; } }
    function safeDecode(str) { try { return decodeURIComponent(str); } catch (e) { return str; } }
    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
    }
    function isChatPage() { return window.location.href.includes('/chat/'); }

    // === TOAST NOTIFICATIONS ===
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
        const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';

        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 99999;
            background: ${bgColor}; color: white; padding: 12px 20px;
            border-radius: 8px; font-family: 'Inter', sans-serif; font-size: 14px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 10px;
            animation: slideIn 0.3s ease-out;
        `;

        toast.innerHTML = `<span style="font-size: 18px; font-weight: bold;">${icon}</span><span>${message}</span>`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // CSS для анимаций
    GM_addStyle(`
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `);

    // === MODAL DRAGGABLE ===
    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        let isDragging = false;

        handle.style.cursor = 'move';
        handle.addEventListener('mousedown', dragMouseDown);

        function dragMouseDown(e) {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            e.preventDefault();
            isDragging = true;
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.addEventListener('mouseup', closeDragElement);
            document.addEventListener('mousemove', elementDrag);
        }

        function elementDrag(e) {
            if (!isDragging) return;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            let newTop = element.offsetTop - pos2;
            let newLeft = element.offsetLeft - pos1;

            if (newTop < 0) newTop = 0;
            if (newLeft < 0) newLeft = 0;
            if (newTop + element.offsetHeight > window.innerHeight) newTop = window.innerHeight - element.offsetHeight;
            if (newLeft + element.offsetWidth > window.innerWidth) newLeft = window.innerWidth - element.offsetWidth;

            element.style.top = newTop + 'px';
            element.style.left = newLeft + 'px';
            element.style.transform = 'none';
        }

        function closeDragElement() {
            isDragging = false;
            document.removeEventListener('mouseup', closeDragElement);
            document.removeEventListener('mousemove', elementDrag);

            const elementId = element.id;
            modalPositions[elementId] = {
                top: element.style.top,
                left: element.style.left
            };
            saveModalPositions();
        }
    }

    function saveModalPositions() {
        GM_setValue('spicychat_modal_positions', JSON.stringify(modalPositions));
    }

    function loadModalPositions() {
        const saved = GM_getValue('spicychat_modal_positions', null);
        if (saved) {
            modalPositions = JSON.parse(saved);
        }
    }

    function applyModalPosition(element) {
        const elementId = element.id;
        if (modalPositions[elementId]) {
            element.style.top = modalPositions[elementId].top;
            element.style.left = modalPositions[elementId].left;
            element.style.transform = 'none';
        }
    }

    function findAvatarImage() {
        const bigImage = document.querySelector('img.object-cover.max-w-full.max-h-full.rounded-xl.object-contain');
        if (bigImage && bigImage.src) return bigImage.src;
        const headerImage = document.querySelector('div.flex.flex-col.justify-undefined img[width="80"]');
        if (headerImage && headerImage.src) return headerImage.src.split('?')[0];
        return null;
    }

    function loadGoogleFont(fontName) {
        if (!fontName) return;
        if (!fontLinkElement) {
            fontLinkElement = document.createElement('link');
            fontLinkElement.rel = 'stylesheet';
            document.head.appendChild(fontLinkElement);
        }
        fontLinkElement.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700&display=swap`;
    }

    function detectSystemFonts() {
        const testString = "mmmmmmmmmmlli";
        const testSize = '72px';
        const baseFonts = ['monospace', 'sans-serif', 'serif'];

        const commonFonts = [
            'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Comic Sans MS', 'Consolas', 'Courier New',
            'Georgia', 'Impact', 'Lucida Console', 'Segoe UI', 'Tahoma', 'Times New Roman',
            'Trebuchet MS', 'Verdana', 'Helvetica', 'Helvetica Neue', 'Monaco', 'Menlo',
            'DejaVu Sans', 'Ubuntu', 'Liberation Sans'
        ];

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        const baseFontWidths = {};
        baseFonts.forEach(baseFont => {
            context.font = testSize + ' ' + baseFont;
            baseFontWidths[baseFont] = context.measureText(testString).width;
        });

        const detectedFonts = [];

        commonFonts.forEach(font => {
            let detected = false;
            for (let baseFont of baseFonts) {
                context.font = testSize + " '" + font + "', " + baseFont;
                const width = context.measureText(testString).width;
                if (width !== baseFontWidths[baseFont]) {
                    detected = true;
                    break;
                }
            }
            if (detected) {
                detectedFonts.push({
                    family: font,
                    category: 'system',
                    source: 'system'
                });
            }
        });

        return detectedFonts;
    }

    function loadGoogleFonts(apiKey, callback) {
        if (!apiKey || apiKey.trim() === '') {
            callback([]);
            return;
        }

        GM_xmlhttpRequest({
            method: 'GET',
            url: `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`,
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    if (data.items) {
                        const fonts = data.items.map(font => ({
                            family: font.family,
                            category: font.category || 'sans-serif',
                            subsets: font.subsets || ['latin'],
                            source: 'google'
                        }));
                        callback(fonts);
                    } else {
                        callback([]);
                    }
                } catch (e) {
                    callback([]);
                }
            },
            onerror: function(err) {
                callback([]);
            }
        });
    }

    function getFilteredFonts() {
        let fonts = currentFontSource === 'system' ? systemFonts : googleFonts;

        if (currentFontFilter === 'favorites') {
            fonts = fonts.filter(f => favoriteFonts.includes(f.family));
        } else {
            if (currentFontSearch.trim() !== '') {
                const search = currentFontSearch.toLowerCase();
                fonts = fonts.filter(f => f.family.toLowerCase().includes(search));
            }

            if (currentFontFilter !== 'all' && currentFontFilter !== 'favorites' && currentFontSource === 'google') {
                fonts = fonts.filter(f => f.subsets && f.subsets.includes(currentFontFilter));
            }
        }

        return fonts;
    }

    function getSampleText() {
        if (currentFontSource === 'system') {
            return SAMPLE_TEXTS['all'];
        } else {
            return SAMPLE_TEXTS[currentFontFilter] || SAMPLE_TEXTS['latin'];
        }
    }

    function toggleFavoriteFont(fontFamily) {
        const index = favoriteFonts.indexOf(fontFamily);
        if (index > -1) {
            favoriteFonts.splice(index, 1);
        } else {
            favoriteFonts.push(fontFamily);
        }
        saveFavoriteFonts();
        renderFontList();
    }

    function saveFavoriteFonts() {
        GM_setValue('spicychat_favorite_fonts', JSON.stringify(favoriteFonts));
    }

    function loadFavoriteFonts() {
        const saved = GM_getValue('spicychat_favorite_fonts', null);
        if (saved) {
            favoriteFonts = JSON.parse(saved);
        }
    }

    // === ШАБЛОНЫ / БЫСТРЫЕ ОТВЕТЫ ===
    function saveGlobalTemplates() {
        GM_setValue('spicychat_global_templates', JSON.stringify(globalTemplates));
    }

    function loadGlobalTemplates() {
        const saved = GM_getValue('spicychat_global_templates', null);
        if (saved) {
            globalTemplates = JSON.parse(saved);
        } else {
            globalTemplates = [
                { title: 'Пример OOC (общий)', content: '((Я сейчас отойду на пару минут))' }
            ];
        }
    }

    function runTemplateMigration() {
        const migrationDone = GM_getValue('spicychat_template_migration_v2', false);
        if (migrationDone) return;

        const oldTemplatesRaw = GM_getValue('spicychat_chat_templates', null);
        if (oldTemplatesRaw) {
            try {
                const oldTemplates = JSON.parse(oldTemplatesRaw);
                const globalTemplatesRaw = GM_getValue('spicychat_global_templates', '[]');
                let currentGlobalTemplates = JSON.parse(globalTemplatesRaw);

                oldTemplates.forEach(oldTpl => {
                    if (!currentGlobalTemplates.some(t => t.title === oldTpl.title && t.content === oldTpl.content)) {
                        currentGlobalTemplates.push(oldTpl);
                    }
                });

                GM_setValue('spicychat_global_templates', JSON.stringify(currentGlobalTemplates));
                GM_setValue('spicychat_template_migration_v2', true);
                console.log("SpicyChat Editor: Migrated old templates to global storage.");
                showToast('Шаблоны перенесены в новое хранилище', 'info');
            } catch (e) {
                console.error("Template migration failed:", e);
            }
        } else {
            GM_setValue('spicychat_template_migration_v2', true);
        }
    }

    // === ИМПОРТ/ЭКСПОРТ ПРОФИЛЕЙ ===
    function exportProfiles() {
        const data = {
            version: '5.7.2',
            profiles: profiles,
            currentProfile: currentProfileName,
            favoriteFonts: favoriteFonts,
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SpicyChat_Profiles_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Профили экспортированы', 'success');
    }

    function importProfiles() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);

                    if (!data.profiles) {
                        showToast('Неверный формат файла', 'error');
                        return;
                    }

                    Object.keys(data.profiles).forEach(key => {
                        profiles[key] = data.profiles[key];
                    });

                    if (data.favoriteFonts) {
                        data.favoriteFonts.forEach(font => {
                            if (!favoriteFonts.includes(font)) {
                                favoriteFonts.push(font);
                            }
                        });
                        saveFavoriteFonts();
                    }

                    saveProfiles();
                    updatePanelUI();
                    showToast(`Импортировано ${Object.keys(data.profiles).length} профилей`, 'success');
                } catch (err) {
                    showToast('Ошибка импорта: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        });
        input.click();
    }

    function exportSingleProfile(profileName) {
        if (!profiles[profileName]) {
            showToast('Профиль не найден', 'error');
            return;
        }

        const data = {
            version: '5.7.2',
            profiles: { [profileName]: profiles[profileName] },
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SpicyChat_${profileName}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Профиль "${profileName}" экспортирован`, 'success');
    }

    function duplicateProfile(profileName) {
        if (!profiles[profileName]) {
            showToast('Профиль не найден', 'error');
            return;
        }

        let newName = profileName + ' (копия)';
        let counter = 1;
        while (profiles[newName]) {
            newName = `${profileName} (копия ${counter})`;
            counter++;
        }

        profiles[newName] = { ...profiles[profileName] };
        saveProfiles();
        updatePanelUI();
        showToast(`Создан "${newName}"`, 'success');
    }

    function renameProfile(oldName) {
        if (!profiles[oldName] || oldName === 'Профиль не выбран') {
            showToast('Нельзя переименовать этот профиль', 'error');
            return;
        }

        const newName = prompt('Введите новое имя профиля:', oldName);
        if (!newName || newName.trim() === '' || newName === oldName) return;

        if (profiles[newName]) {
            showToast('Профиль с таким именем уже существует', 'error');
            return;
        }

        profiles[newName] = profiles[oldName];
        delete profiles[oldName];

        if (currentProfileName === oldName) {
            currentProfileName = newName;
        }

        saveProfiles();
        updatePanelUI();
        showToast(`Переименовано в "${newName}"`, 'success');
    }

    // === МОДАЛЬНОЕ ОКНО ТЕКСТОВЫХ НАСТРОЕК ===
    function openTextSettingsModal() {
        let modal = document.getElementById('text-settings-modal');
        if (modal) {
            modal.style.display = 'flex';
            updateTextSettingsUI();
            return;
        }

        modal = document.createElement('div');
        modal.id = 'text-settings-modal';
        modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 10002; display: flex; align-items: center; justify-content: center;
            font-family: 'Inter', sans-serif;
        `;

        modal.innerHTML = `
            <div style="background: #1f2937; border-radius: 8px; width: 820px; max-height: 90vh; display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                <div id="text-modal-header" style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #1f2937 0%, #374151 100%);">
                    <h3 style="margin: 0; color: white; font-size: 16px; font-weight: 700;">🔤 Настройки текста</h3>
                    <button id="close-text-modal" title="Закрыть" style="background: rgba(255,255,255,0.1); border: none; color: white; font-size: 22px; cursor: pointer; padding: 0; width: 30px; height: 30px; border-radius: 5px;">×</button>
                </div>

                <div style="display: flex; flex: 1; overflow: hidden; min-height: 0;">
                    <div style="width: 48%; border-right: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; background: #111827;">
                        <div style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                                <label style="display: flex; align-items: center; gap: 5px; color: white; cursor: pointer; font-size: 12px;" title="Системные шрифты">
                                    <input type="radio" name="font-source" value="system" checked style="width:15px; height:15px;"> 📂
                                </label>
                                <label style="display: flex; align-items: center; gap: 5px; color: white; cursor: pointer; font-size: 12px;" title="Google Fonts">
                                    <input type="radio" name="font-source" value="google" style="width:15px; height:15px;"> 🌐
                                </label>
                            </div>

                            <div style="display: flex; gap: 7px; margin-bottom: 8px;">
                                <input type="text" id="font-search" placeholder="🔍 Поиск" title="Поиск шрифта" style="flex: 1; padding: 5px 7px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 4px; font-size: 12px;">
                                <select id="font-filter" title="Фильтр" style="padding: 5px 7px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 4px; font-size: 12px;">
                                    <option value="all">Все</option>
                                    <option value="favorites">⭐</option>
                                </select>
                            </div>

                            <div style="display: flex; align-items: center; gap: 7px;">
                                <label style="color: white; font-size: 11px; min-width: 42px;" title="Размер шрифта">Размер:</label>
                                <input type="range" id="modal-font-size-slider" min="50" max="300" value="${currentSettings.fontSize}" title="Размер шрифта" style="flex: 1; height: 4px; accent-color: #60a5fa;">
                                <input type="number" id="modal-font-size-input" value="${currentSettings.fontSize}" title="Размер шрифта" style="width: 46px; padding: 4px; font-size: 11px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 4px; text-align: center;">
                                <span style="font-size: 10px; color: #9ca3af;">%</span>
                            </div>
                        </div>

                        <div id="font-list" style="padding: 7px; overflow-y: auto; flex: 1;"></div>

                        <div style="padding: 7px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; gap: 7px;">
                            <button id="font-prev-page" title="Предыдущая страница" style="padding: 4px 10px; background: #4b5563; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 10px;">←</button>
                            <input type="number" id="font-page-input" min="1" value="1" title="Номер страницы" style="width: 46px; padding: 4px; font-size: 10px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 4px; text-align: center;">
                            <span id="font-page-info" style="color: #9ca3af; font-size: 10px;">1/1</span>
                            <button id="font-next-page" title="Следующая страница" style="padding: 4px 10px; background: #4b5563; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 10px;">→</button>
                        </div>
                    </div>

                    <div style="width: 52%; display: flex; flex-direction: column; background: #1f2937;">
                        <div id="font-preview-panel" style="flex: 1; padding: 12px; overflow-y: auto; border-bottom: 1px solid rgba(255,255,255,0.1); min-height: 200px; max-height: 250px;">
                            <div style="text-align: center; color: #9ca3af; padding: 24px; font-size: 12px;">
                                Кликните на шрифт для предпросмотра
                            </div>
                        </div>

                        <div style="padding: 12px; overflow-y: auto;">
                            <div style="margin-bottom: 10px;">
                                <label style="display: block; color: white; font-size: 11px; margin-bottom: 5px; font-weight: 600;" title="API ключ для Google Fonts">Google API:</label>
                                <input type="text" id="text-google-fonts-api-key" value="${currentSettings.googleFontsApiKey || ''}" placeholder="AIzaSy..." title="Вставьте API ключ Google Fonts" style="width: 100%; padding: 5px 7px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 4px; font-size: 11px;">
                                <a href="https://developers.google.com/fonts/docs/developer_api#APIKey" target="_blank" style="font-size: 10px; color: #60a5fa; text-decoration: none; display: inline-block; margin-top: 3px;">Получить →</a>
                            </div>

                            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                                <div style="flex:1;">
                                    <label style="display: block; color: white; font-size: 11px; margin-bottom: 5px; font-weight: 600;" title="Выравнивание текста">Выравн.:</label>
                                    <select id="text-message-align" title="Выравнивание текста" style="width: 100%; padding: 5px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 4px; font-size: 12px;">
                                        <option value="left">◀ Слева</option>
                                        <option value="center">▣ Центр</option>
                                        <option value="right">▶ Справа</option>
                                    </select>
                                </div>
                                <div style="flex:1; display:flex; align-items:flex-end;">
                                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 6px 10px; background: rgba(255,255,255,0.05); border-radius: 5px; width:100%; justify-content:center;" title="Добавить тень к тексту">
                                        <input type="checkbox" id="text-shadow-check" ${currentSettings.textShadow ? 'checked' : ''} style="width: 14px; height: 14px; cursor: pointer;">
                                        <span style="color: white; font-size: 11px; font-weight: 600;">✨ Тень</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        applyModalPosition(modal);
        makeDraggable(modal, modal.querySelector('#text-modal-header'));

        modal.querySelector('#close-text-modal').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        modal.querySelectorAll('input[name="font-source"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                currentFontSource = e.target.value;
                currentFontPage = 0;
                selectedFontForPreview = null;
                updateFontFilterOptions();

                if (currentFontSource === 'google' && googleFonts.length === 0 && currentSettings.googleFontsApiKey) {
                    loadGoogleFonts(currentSettings.googleFontsApiKey, (fonts) => {
                        googleFonts = fonts;
                        renderFontList();
                    });
                } else {
                    renderFontList();
                }

                clearPreview();
            });
        });

        modal.querySelector('#font-search').addEventListener('input', (e) => {
            currentFontSearch = e.target.value;
            currentFontPage = 0;
            renderFontList();
        });

        modal.querySelector('#font-filter').addEventListener('change', (e) => {
            currentFontFilter = e.target.value;
            currentFontPage = 0;
            renderFontList();
            if (selectedFontForPreview) {
                updatePreview();
            }
        });

        const sizeSlider = modal.querySelector('#modal-font-size-slider');
        const sizeInput = modal.querySelector('#modal-font-size-input');

        sizeSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            currentSettings.fontSize = val;
            sizeInput.value = val;
            applyStyles();
            saveProfiles();
        });

        sizeInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value);
            if (val < 50) val = 50;
            if (val > 300) val = 300;
            currentSettings.fontSize = val;
            sizeSlider.value = val;
            applyStyles();
            saveProfiles();
        });

        modal.querySelector('#font-prev-page').addEventListener('click', () => {
            if (currentFontPage > 0) {
                currentFontPage--;
                renderFontList();
                updatePageInput();
            }
        });

        modal.querySelector('#font-next-page').addEventListener('click', () => {
            const totalPages = Math.ceil(getFilteredFonts().length / FONTS_PER_PAGE);
            if (currentFontPage < totalPages - 1) {
                currentFontPage++;
                renderFontList();
                updatePageInput();
            }
        });

        modal.querySelector('#font-page-input').addEventListener('change', (e) => {
            const totalPages = Math.ceil(getFilteredFonts().length / FONTS_PER_PAGE);
            let page = parseInt(e.target.value) - 1;
            if (page < 0) page = 0;
            if (page >= totalPages) page = totalPages - 1;
            currentFontPage = page;
            renderFontList();
            updatePageInput();
        });

        modal.querySelector('#text-google-fonts-api-key').addEventListener('change', (e) => {
            const apiKey = e.target.value.trim();
            currentSettings.googleFontsApiKey = apiKey;
            saveProfiles();

            if (apiKey) {
                loadGoogleFonts(apiKey, (fonts) => {
                    googleFonts = fonts;
                    if (fonts.length > 0) {
                        showToast(`Загружено ${fonts.length} шрифтов`, 'success');
                        if (currentFontSource === 'google') {
                            renderFontList();
                        }
                    } else {
                        showToast('Ошибка загрузки шрифтов', 'error');
                    }
                });
            }
        });

        modal.querySelector('#text-message-align').addEventListener('change', (e) => {
            currentSettings.messageAlign = e.target.value;
            applyStyles();
            saveProfiles();
        });

        modal.querySelector('#text-shadow-check').addEventListener('change', (e) => {
            currentSettings.textShadow = e.target.checked;
            applyStyles();
            saveProfiles();
        });

        if (systemFonts.length === 0) {
            systemFonts = detectSystemFonts();
        }

        selectedFontForPreview = null;
        renderFontList();
        updateTextSettingsUI();
    }

    function updatePageInput() {
        const input = document.querySelector('#font-page-input');
        if (input) {
            input.value = currentFontPage + 1;
        }
    }

    function updateTextSettingsUI() {
        const modal = document.getElementById('text-settings-modal');
        if (!modal) return;

        const slider = modal.querySelector('#modal-font-size-slider');
        const input = modal.querySelector('#modal-font-size-input');
        if (slider) slider.value = currentSettings.fontSize;
        if (input) input.value = currentSettings.fontSize;

        modal.querySelector('#text-google-fonts-api-key').value = currentSettings.googleFontsApiKey || '';
        modal.querySelector('#text-message-align').value = currentSettings.messageAlign;
        modal.querySelector('#text-shadow-check').checked = currentSettings.textShadow;
    }

    function updateFontFilterOptions() {
        const filterSelect = document.querySelector('#font-filter');
        if (!filterSelect) return;

        if (currentFontSource === 'system') {
            filterSelect.innerHTML = `
                <option value="all">Все</option>
                <option value="favorites">⭐</option>
            `;
        } else {
            filterSelect.innerHTML = `
                <option value="all">Все</option>
                <option value="favorites">⭐</option>
                <option value="latin">Latin</option>
                <option value="cyrillic">Кириллица</option>
                <option value="greek">Греч.</option>
                <option value="arabic">Араб.</option>
            `;
        }
        currentFontFilter = 'all';
    }

    function clearPreview() {
        const panel = document.getElementById('font-preview-panel');
        if (!panel) return;
        panel.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 24px; font-size: 12px;">Кликните на шрифт для предпросмотра</div>';
    }

    function renderFontList() {
        const list = document.getElementById('font-list');
        if (!list) return;

        const fonts = getFilteredFonts();
        const totalPages = Math.ceil(fonts.length / FONTS_PER_PAGE);
        const startIdx = currentFontPage * FONTS_PER_PAGE;
        const endIdx = Math.min(startIdx + FONTS_PER_PAGE, fonts.length);
        const pageFonts = fonts.slice(startIdx, endIdx);

        const pageInfo = document.getElementById('font-page-info');
        if (pageInfo) {
            pageInfo.textContent = `/${totalPages || 1}`;
        }

        updatePageInput();

        const prevBtn = document.getElementById('font-prev-page');
        const nextBtn = document.getElementById('font-next-page');
        if (prevBtn) prevBtn.disabled = currentFontPage === 0;
        if (nextBtn) nextBtn.disabled = currentFontPage >= totalPages - 1;

        list.innerHTML = '';

        if (pageFonts.length === 0) {
            list.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 24px; font-size: 12px;">Не найдено</div>';
            return;
        }

        pageFonts.forEach(font => {
            const isSelected = currentSettings.fontFamily === font.family;
            const isClicked = selectedFontForPreview && selectedFontForPreview.family === font.family;
            const isFavorite = favoriteFonts.includes(font.family);

            const item = document.createElement('div');
            item.style.cssText = `
                padding: 7px 9px; margin-bottom: 3px; background: ${isClicked ? '#374151' : '#1f2937'};
                border-radius: 5px; cursor: pointer; border: 2px solid ${isSelected ? '#60a5fa' : 'transparent'};
                transition: all 0.2s; display: flex; justify-content: space-between; align-items: center;
            `;

            item.innerHTML = `
                <div style="flex: 1; overflow: hidden; font-family: '${font.family}', sans-serif; color: white; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${font.family}</div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <span class="star-icon" title="${isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}" style="cursor: pointer; font-size: 16px; ${isFavorite ? 'filter: grayscale(0);' : 'filter: grayscale(1); opacity: 0.3;'}">${isFavorite ? '⭐' : '⭐'}</span>
                    ${isSelected ? '<div style="color: #60a5fa; font-size: 13px;">✓</div>' : ''}
                </div>
            `;

            const starIcon = item.querySelector('.star-icon');
            starIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavoriteFont(font.family);
            });

            item.addEventListener('mouseenter', () => {
                if (!isClicked) item.style.background = '#2d3748';
            });

            item.addEventListener('mouseleave', () => {
                if (!isClicked) item.style.background = '#1f2937';
            });

            item.addEventListener('click', () => {
                currentSettings.fontFamily = font.family;
                if (font.source === 'google') {
                    currentSettings.isGoogleFont = true;
                    currentSettings.customFontName = '';
                } else {
                    currentSettings.isGoogleFont = false;
                    currentSettings.customFontName = '';
                }

                applyStyles();
                saveProfiles();

                selectedFontForPreview = font;
                updatePreview();
                renderFontList();
            });

            list.appendChild(item);
        });

        if (currentFontSource === 'google' && pageFonts.length > 0) {
            const fontFamilies = pageFonts.slice(0, 15).map(f => `family=${f.family.replace(/ /g, '+')}`).join('&');
            if (fontFamilies) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;
                document.head.appendChild(link);
            }
        }
    }

    function updatePreview() {
        const panel = document.getElementById('font-preview-panel');
        if (!panel || !selectedFontForPreview) return;

        const sampleText = getSampleText();

        panel.innerHTML = `
            <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                <h4 style="margin: 0 0 3px 0; color: white; font-size: 14px;">${selectedFontForPreview.family}</h4>
                <p style="margin: 0; color: #9ca3af; font-size: 10px;">${selectedFontForPreview.category}${selectedFontForPreview.source === 'google' ? ' • Google' : ' • System'}</p>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 5px; margin-bottom: 10px;">
                <div style="font-family: '${selectedFontForPreview.family}', sans-serif; color: white; font-size: 24px; line-height: 1.2; word-wrap: break-word;">${selectedFontForPreview.family}</div>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 5px;">
                <div style="font-family: '${selectedFontForPreview.family}', sans-serif; color: #d1d5db; font-size: 13px; line-height: 1.4; white-space: pre-wrap; word-wrap: break-word;">${sampleText}</div>
            </div>
        `;

        if (selectedFontForPreview.source === 'google') {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `https://fonts.googleapis.com/css2?family=${selectedFontForPreview.family.replace(/ /g, '+')}:wght@400;700&display=swap`;
            document.head.appendChild(link);
        }
    }

    // === МОДАЛЬНОЕ ОКНО ВИЗУАЛЬНЫХ НАСТРОЕК (КОМПАКТНОЕ + ЦВЕТА) ===
    function openVisualSettingsModal() {
        let modal = document.getElementById('visual-settings-modal');
        if (modal) {
            modal.style.display = 'flex';
            updateVisualSettingsUI();
            return;
        }

        const createSlider = (id, label, min, max, val, unit = '', tooltip = '') => `
            <div style="margin-bottom: 8px; padding: 7px; background: rgba(255,255,255,0.03); border-radius: 5px;">
                <label style="display: block; color: white; font-size: 11px; margin-bottom: 5px; font-weight: 600;" title="${tooltip}">${label}</label>
                <div style="display: flex; align-items: center; gap: 7px;">
                    <input type="range" id="visual-slider-${id}" min="${min}" max="${max}" value="${val}" title="${tooltip}" style="flex: 1; height: 4px; accent-color: #60a5fa;">
                    <input type="number" id="visual-input-${id}" value="${val}" title="${tooltip}" style="width: 50px; padding: 4px; font-size: 11px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 4px; text-align: center;">
                    <span style="font-size: 10px; color: #9ca3af; min-width: 20px;">${unit}</span>
                </div>
            </div>`;

        const createColorInput = (id, label, val) => `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; padding:4px 6px; background:rgba(0,0,0,0.15); border-radius:4px;"><label style="font-size:11px; color:#e5e7eb;">${label}</label><input type="color" id="${id}" value="${val}" title="${label}" style="border:none; width:32px; height:22px; cursor:pointer; background:none; border-radius:4px;"></div>`;

        modal = document.createElement('div');
        modal.id = 'visual-settings-modal';
        modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 10002; display: flex; align-items: center; justify-content: center;
            font-family: 'Inter', sans-serif;
        `;

        modal.innerHTML = `
            <div style="background: #1f2937; border-radius: 8px; width: 620px; max-height: 90vh; overflow-y: auto; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                <div id="visual-modal-header" style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: linear-gradient(135deg, #1f2937 0%, #374151 100%); z-index: 1;">
                    <h3 style="margin: 0; color: white; font-size: 16px; font-weight: 700;">🎨 Визуальные настройки</h3>
                    <button id="close-visual-modal" title="Закрыть" style="background: rgba(255,255,255,0.1); border: none; color: white; font-size: 22px; cursor: pointer; padding: 0; width: 30px; height: 30px; border-radius: 5px;">×</button>
                </div>

                <div style="padding: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <!-- Левая колонка -->
                    <div>
                        ${createSlider('chatOpacity', '💧 Непрозрачность', 0, 100, currentSettings.chatOpacity, '%', 'Прозрачность сообщений (0-100%)')}
                        ${createSlider('blurAmount', '🌫️ Размытие', 0, 30, currentSettings.blurAmount, 'px', 'Размытие фона (0-30px)')}
                        ${createSlider('bubbleRadius', '⚪ Закругление', 0, 30, currentSettings.bubbleRadius, 'px', 'Радиус закругления углов (0-30px)')}

                        <div style="margin-bottom: 8px; padding: 7px; background: rgba(255,255,255,0.03); border-radius: 5px;">
                            <label style="display: block; color: white; font-size: 11px; margin-bottom: 5px; font-weight: 600;" title="Размер аватара персонажа в шапке">🖼️ Аватар:</label>
                            <select id="visual-header-avatar-size" title="Размер аватара в шапке" style="width: 100%; padding: 6px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 4px; font-size: 11px;">
                                <option value="normal">80px</option>
                                <option value="medium">150px</option>
                                <option value="large">300px (HD)</option>
                            </select>
                        </div>

                        <div style="margin-bottom: 8px;">
                            <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 6px; background: rgba(248,113,113,0.1); border-radius: 5px;" title="Скрыть боковую панель и шапку">
                                <input type="checkbox" id="visual-cinema-mode" ${currentSettings.cinemaMode ? 'checked' : ''} style="width: 14px; height: 14px; cursor: pointer;">
                                <span style="color: #f87171; font-size: 11px; font-weight: 600;">🎬 Режим кинотеатра</span>
                            </label>
                        </div>
                    </div>

                    <!-- Правая колонка -->
                    <div>
                        ${createSlider('chatWidth', '↔️ Ширина чата', 20, 200, currentSettings.chatWidth, '%', 'Ширина области чата (20-200%)')}
                        ${createSlider('inputWidth', '📝 Ширина ввода', 20, 200, currentSettings.inputWidth, '%', 'Ширина поля ввода (20-200%)')}
                        ${createSlider('inputHeight', '📏 Высота ввода', 50, 500, currentSettings.inputHeight, '%', 'Высота поля ввода (50-500%)')}
                    </div>
                </div>

                <!-- Фон -->
                <div style="padding: 0 12px 12px 12px;">
                    <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 7px; margin-bottom: 12px;">
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; margin-bottom: 8px; padding: 5px; background: rgba(255,255,255,0.05); border-radius: 5px;" title="Использовать аватар персонажа как фон чата">
                            <input type="checkbox" id="visual-use-avatar-bg" ${currentSettings.useAvatarAsBackground ? 'checked' : ''} style="width: 14px; height: 14px; cursor: pointer;">
                            <span style="color: white; font-size: 11px; font-weight: 600;">📷 Аватар как фон</span>
                        </label>

                        <label style="display: block; color: white; font-size: 10px; margin-bottom: 5px; font-weight: 600;" title="Прямая ссылка на изображение фона">🌄 URL фона:</label>
                        <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                            <input type="text" id="visual-background-image" value="${currentSettings.backgroundImage}" placeholder="https://..." title="Вставьте URL изображения" style="flex: 1; padding: 5px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 4px; font-size: 10px;">
                            <label for="visual-file-upload" title="Загрузить изображение" style="cursor: pointer; padding: 5px 10px; background: #60a5fa; border-radius: 4px; color: white; font-weight: 600; font-size: 11px;">📤</label>
                            <input type="file" id="visual-file-upload" accept="image/*" style="display: none;">
                        </div>

                        <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                            <div style="flex: 1;">
                                <label style="display: block; color: #9ca3af; font-size: 9px; margin-bottom: 3px;" title="Как изображение заполняет фон">Размер:</label>
                                <select id="visual-background-size" title="Размер фона" style="width: 100%; padding: 5px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 4px; font-size: 10px;">
                                    <option value="cover">Cover</option>
                                    <option value="contain">Contain</option>
                                    <option value="auto">Auto</option>
                                </select>
                            </div>
                            <div style="flex: 1;">
                                <label style="display: block; color: #9ca3af; font-size: 9px; margin-bottom: 3px;" title="Повторять ли изображение">Повтор:</label>
                                <select id="visual-background-repeat" title="Повтор фона" style="width: 100%; padding: 5px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 4px; font-size: 10px;">
                                    <option value="no-repeat">No-Repeat</option>
                                    <option value="repeat">Repeat</option>
                                </select>
                            </div>
                        </div>
                        <div style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 5px;">
                            <div style="color: #9ca3af; font-size: 10px; margin-bottom: 5px; font-weight: 600; text-align: center;">Фильтры фона</div>
                             ${createSlider('backgroundBrightness', '🔆 Яркость', 0, 200, currentSettings.backgroundBrightness, '%', 'Яркость фона (0-200%)')}
                             ${createSlider('backgroundContrast', '🌗 Контраст', 0, 200, currentSettings.backgroundContrast, '%', 'Контраст фона (0-200%)')}
                             ${createSlider('backgroundSaturation', '🎨 Насыщенность', 0, 200, currentSettings.backgroundSaturation, '%', 'Насыщенность фона (0-200%)')}
                        </div>
                    </div>

                    <!-- Цвета -->
                    <div style="background: rgba(251,191,36,0.1); padding: 10px; border-radius: 7px;">
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; margin-bottom: 8px; padding: 5px; background: rgba(251,191,36,0.15); border-radius: 5px;" title="Использовать свои цвета">
                            <input type="checkbox" id="visual-use-custom-colors" ${currentSettings.useCustomColors ? 'checked' : ''} style="width: 14px; height: 14px; cursor: pointer;">
                            <span style="color: #fbbf24; font-size: 11px; font-weight: 600;">🌈 Свои цвета</span>
                        </label>

                        <div id="visual-colors-container" style="${currentSettings.useCustomColors ? '' : 'opacity:0.4; pointer-events:none;'}">
                             <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; margin-bottom: 8px; padding: 5px; background: rgba(255,255,255,0.05); border-radius: 5px;" title="Использовать градиент вместо сплошного цвета">
                                <input type="checkbox" id="visual-use-gradient" ${currentSettings.useGradient ? 'checked' : ''} style="width: 14px; height: 14px; cursor: pointer;">
                                <span style="color: white; font-size: 11px; font-weight: 600;">Gradients</span>
                            </label>
                            ${createSlider('gradientAngle', '↔️ Угол', 0, 360, currentSettings.gradientAngle, '°', 'Угол градиента')}
                            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px;">
                                <div style="background: rgba(0,0,0,0.2); padding: 6px; border-radius: 5px;">
                                    <div style="color: #9ca3af; font-size: 10px; margin-bottom: 5px; font-weight: 600; text-align: center;">🤖 БОТ</div>
                                    ${createColorInput('visual-bot-msg-color', 'Цвет 1', currentSettings.botMsgColor)}
                                    ${createColorInput('visual-bot-msg-color-2', 'Цвет 2', currentSettings.botMsgColor2)}
                                    ${createColorInput('visual-bot-text-color', 'Текст', currentSettings.botTextColor)}
                                    ${createColorInput('visual-bot-italic-color', 'Курсив', currentSettings.botItalicColor)}
                                </div>

                                <div style="background: rgba(0,0,0,0.2); padding: 6px; border-radius: 5px;">
                                    <div style="color: #9ca3af; font-size: 10px; margin-bottom: 5px; font-weight: 600; text-align: center;">👤 ВЫ</div>
                                    ${createColorInput('visual-user-msg-color', 'Цвет 1', currentSettings.userMsgColor)}
                                    ${createColorInput('visual-user-msg-color-2', 'Цвет 2', currentSettings.userMsgColor2)}
                                    ${createColorInput('visual-user-text-color', 'Текст', currentSettings.userTextColor)}
                                    ${createColorInput('visual-user-italic-color', 'Курсив', currentSettings.userItalicColor)}
                                </div>

                                <div style="background: rgba(0,0,0,0.2); padding: 6px; border-radius: 5px;">
                                    <div style="color: #9ca3af; font-size: 10px; margin-bottom: 5px; font-weight: 600; text-align: center;">📝 ПОЛЕ ВВОДА</div>
                                    ${createColorInput('visual-input-bg-color', 'Фон', currentSettings.inputBgColor)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        applyModalPosition(modal);
        makeDraggable(modal, modal.querySelector('#visual-modal-header'));

        modal.querySelector('#close-visual-modal').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        const bindSlider = (key, id) => {
            const slider = modal.querySelector(`#visual-slider-${id}`);
            const input = modal.querySelector(`#visual-input-${id}`);

            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                currentSettings[key] = val;
                input.value = val;
                applyStyles();
                saveProfiles();
            });

            input.addEventListener('change', (e) => {
                let val = parseInt(e.target.value);
                if (val < parseInt(slider.min)) val = parseInt(slider.min);
                if (val > parseInt(slider.max)) val = parseInt(slider.max);
                currentSettings[key] = val;
                slider.value = val;
                applyStyles();
                saveProfiles();
            });
        };

        bindSlider('chatOpacity', 'chatOpacity');
        bindSlider('blurAmount', 'blurAmount');
        bindSlider('bubbleRadius', 'bubbleRadius');
        bindSlider('chatWidth', 'chatWidth');
        bindSlider('inputWidth', 'inputWidth');
        bindSlider('inputHeight', 'inputHeight');
        bindSlider('backgroundBrightness', 'backgroundBrightness');
        bindSlider('backgroundContrast', 'backgroundContrast');
        bindSlider('backgroundSaturation', 'backgroundSaturation');
        bindSlider('gradientAngle', 'gradientAngle');

        modal.querySelector('#visual-header-avatar-size').addEventListener('change', (e) => {
            currentSettings.headerAvatarSize = e.target.value;
            applyStyles();
            saveProfiles();
        });

        modal.querySelector('#visual-use-avatar-bg').addEventListener('change', (e) => {
            currentSettings.useAvatarAsBackground = e.target.checked;
            modal.querySelector('#visual-background-image').disabled = e.target.checked;
            applyStyles();
            saveProfiles();
        });

        modal.querySelector('#visual-background-image').addEventListener('change', (e) => {
            currentSettings.backgroundImage = e.target.value.trim();
            applyStyles();
            saveProfiles();
        });

        modal.querySelector('#visual-background-size').addEventListener('change', (e) => {
            currentSettings.backgroundSize = e.target.value;
            applyStyles();
            saveProfiles();
        });

        modal.querySelector('#visual-background-repeat').addEventListener('change', (e) => {
            currentSettings.backgroundRepeat = e.target.value;
            applyStyles();
            saveProfiles();
        });

        modal.querySelector('#visual-cinema-mode').addEventListener('change', (e) => {
            currentSettings.cinemaMode = e.target.checked;
            applyStyles();
            saveProfiles();
        });

        modal.querySelector('#visual-file-upload').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const urlInput = modal.querySelector('#visual-background-image');
            urlInput.value = 'Загрузка...';
            urlInput.disabled = true;
            uploadImageToCatbox(file, (url) => {
                urlInput.value = url;
                currentSettings.backgroundImage = url;
                urlInput.disabled = false;
                applyStyles();
                saveProfiles();
            });
        });

        // Цвета
        modal.querySelector('#visual-use-custom-colors').addEventListener('change', (e) => {
            currentSettings.useCustomColors = e.target.checked;
            modal.querySelector('#visual-colors-container').style.opacity = e.target.checked ? '1' : '0.4';
            modal.querySelector('#visual-colors-container').style.pointerEvents = e.target.checked ? 'auto' : 'none';
            applyStyles();
            saveProfiles();
        });

        const bindColor = (id, key) => {
            modal.querySelector(`#${id}`).addEventListener('input', (e) => {
                currentSettings[key] = e.target.value;
                applyStyles();
                saveProfiles();
            });
        };

        modal.querySelector('#visual-use-gradient').addEventListener('change', (e) => {
            currentSettings.useGradient = e.target.checked;
            applyStyles();
            saveProfiles();
        });

        bindColor('visual-bot-msg-color', 'botMsgColor');
        bindColor('visual-bot-text-color', 'botTextColor');
        bindColor('visual-bot-italic-color', 'botItalicColor');
        bindColor('visual-bot-msg-color-2', 'botMsgColor2');
        bindColor('visual-user-msg-color', 'userMsgColor');
        bindColor('visual-user-text-color', 'userTextColor');
        bindColor('visual-user-italic-color', 'userItalicColor');
        bindColor('visual-user-msg-color-2', 'userMsgColor2');
        bindColor('visual-input-bg-color', 'inputBgColor');

        updateVisualSettingsUI();
    }

    function updateVisualSettingsUI() {
        const modal = document.getElementById('visual-settings-modal');
        if (!modal) return;

        ['chatOpacity', 'blurAmount', 'bubbleRadius', 'chatWidth', 'inputWidth', 'inputHeight', 'backgroundBrightness', 'backgroundContrast', 'backgroundSaturation', 'gradientAngle'].forEach(k => {
            const slider = modal.querySelector(`#visual-slider-${k}`);
            const input = modal.querySelector(`#visual-input-${k}`);
            if (slider) slider.value = currentSettings[k];
            if (input) input.value = currentSettings[k];
        });

        modal.querySelector('#visual-header-avatar-size').value = currentSettings.headerAvatarSize || 'normal';
        modal.querySelector('#visual-use-avatar-bg').checked = currentSettings.useAvatarAsBackground;
        modal.querySelector('#visual-background-image').value = currentSettings.backgroundImage || '';
        modal.querySelector('#visual-background-image').disabled = currentSettings.useAvatarAsBackground;
        modal.querySelector('#visual-background-size').value = currentSettings.backgroundSize || 'cover';
        modal.querySelector('#visual-background-repeat').value = currentSettings.backgroundRepeat || 'no-repeat';
        modal.querySelector('#visual-cinema-mode').checked = currentSettings.cinemaMode;

        modal.querySelector('#visual-use-custom-colors').checked = currentSettings.useCustomColors;
        modal.querySelector('#visual-colors-container').style.opacity = currentSettings.useCustomColors ? '1' : '0.4';
        modal.querySelector('#visual-colors-container').style.pointerEvents = currentSettings.useCustomColors ? 'auto' : 'none';

        modal.querySelector('#visual-use-gradient').checked = currentSettings.useGradient;

        modal.querySelector('#visual-bot-msg-color').value = currentSettings.botMsgColor;
        modal.querySelector('#visual-bot-msg-color-2').value = currentSettings.botMsgColor2;
        modal.querySelector('#visual-bot-text-color').value = currentSettings.botTextColor;
        modal.querySelector('#visual-bot-italic-color').value = currentSettings.botItalicColor;
        modal.querySelector('#visual-user-msg-color').value = currentSettings.userMsgColor;
        modal.querySelector('#visual-user-msg-color-2').value = currentSettings.userMsgColor2;
        modal.querySelector('#visual-user-text-color').value = currentSettings.userTextColor;
        modal.querySelector('#visual-user-italic-color').value = currentSettings.userItalicColor;
        modal.querySelector('#visual-input-bg-color').value = currentSettings.inputBgColor;
    }

    // === МОДАЛЬНОЕ ОКНО ШАБЛОНОВ ===
    function openTemplatesModal() {
        let modal = document.getElementById('templates-modal');
        if (modal) {
            modal.style.display = 'flex';
            renderTemplatesList();
            return;
        }

        modal = document.createElement('div');
        modal.id = 'templates-modal';
        modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 10002; display: flex; align-items: center; justify-content: center;
            font-family: 'Inter', sans-serif;
        `;

        modal.innerHTML = `
            <div style="background: #1f2937; border-radius: 8px; width: 600px; max-height: 90vh; display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                <div id="templates-modal-header" style="padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #1f2937 0%, #374151 100%);">
                    <h3 style="margin: 0; color: white; font-size: 16px; font-weight: 700;">📋 Шаблоны / Быстрые ответы</h3>
                    <button id="close-templates-modal" title="Закрыть" style="background: rgba(255,255,255,0.1); border: none; color: white; font-size: 22px; cursor: pointer; padding: 0; width: 30px; height: 30px; border-radius: 5px;">×</button>
                </div>

                <div style="display: flex; flex: 1; overflow: hidden; min-height: 500px;">
                    <div id="templates-list-container" style="width: 40%; border-right: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; background: #111827; overflow-y: auto;">
                        <!-- Template list will be rendered here -->
                    </div>

                    <div style="width: 60%; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                        <h4 id="template-editor-title" style="margin:0; color:white; font-size: 14px; font-weight:600;">Новый шаблон</h4>
                        <input type="hidden" id="template-edit-index" value="-1">
                        <input type="hidden" id="template-edit-type" value="global">
                        <input type="text" id="template-title-input" placeholder="Название шаблона" style="width: 100%; padding: 8px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 4px; font-size: 13px;">
                        <textarea id="template-content-input" placeholder="Текст шаблона..." style="width: 100%; flex: 1; padding: 8px; background: #374151; color: white; border: 1px solid #4b5563; border-radius: 4px; font-size: 13px; resize: vertical;"></textarea>

                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 5px;" title="Если включено, шаблон будет виден только в текущем профиле">
                            <input type="checkbox" id="template-is-profile-specific" style="width: 15px; height: 15px; cursor: pointer;">
                            <span style="color: white; font-size: 12px; font-weight: 600;">Привязать к текущему профилю</span>
                        </label>

                        <div style="display:flex; gap: 10px;">
                            <button id="save-template-btn" style="flex:1; padding: 9px; background: #10b981; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight:600;">Сохранить</button>
                            <button id="clear-template-form-btn" style="padding: 9px; background: #4b5563; color: white; border: none; border-radius: 5px; cursor: pointer;">Очистить</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        applyModalPosition(modal);
        makeDraggable(modal, modal.querySelector('#templates-modal-header'));

        modal.querySelector('#close-templates-modal').addEventListener('click', () => modal.style.display = 'none');
        modal.querySelector('#save-template-btn').addEventListener('click', saveTemplate);
        modal.querySelector('#clear-template-form-btn').addEventListener('click', clearTemplateForm);

        renderTemplatesList();
    }

    function renderTemplatesList() {
        const container = document.getElementById('templates-list-container');
        if (!container) return;
        container.innerHTML = '';

        const renderList = (title, templates, type) => {
            container.innerHTML += `<h5 style="padding: 10px 12px 5px; margin: 5px 0 0; color: #9ca3af; font-size: 11px; font-weight: 600; text-transform: uppercase;">${title}</h5>`;
            if (templates.length === 0) {
                container.innerHTML += `<div style="padding: 10px 12px; color: #6b7280; font-size: 12px;">Пусто</div>`;
                return;
            }

            templates.forEach((template, index) => {
                const item = document.createElement('div');
                item.style.cssText = `
                    padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.05);
                    display: flex; justify-content: space-between; align-items: center; cursor: pointer;
                `;
                item.innerHTML = `
                    <div style="color: white; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${template.title}">${template.title}</div>
                    <div style="display:flex; gap: 5px;">
                        <button class="delete-template-btn" data-index="${index}" data-type="${type}" title="Удалить" style="background: #ef4444; border:none; color:white; border-radius:4px; width:22px; height:22px; font-size:12px;">🗑️</button>
                    </div>
                `;
                item.addEventListener('click', (e) => {
                    if (e.target.classList.contains('delete-template-btn')) return;
                    editTemplate(index, type);
                });
                item.querySelector('.delete-template-btn').addEventListener('click', () => deleteTemplate(index, type));
                container.appendChild(item);
            });
        };

        renderList('🌐 Общие', globalTemplates, 'global');

        const profileName = currentProfileName !== 'Профиль не выбран' ? `👤 ${currentProfileName}` : '👤 Профиль не выбран';
        const profileTemplates = (currentProfileName !== 'Профиль не выбран' && currentSettings.templates) ? currentSettings.templates : [];
        const profileContainer = document.createElement('div');
        if (currentProfileName === 'Профиль не выбран') {
            profileContainer.style.opacity = '0.5';
        }
        renderList(profileName, profileTemplates, 'profile');
    }

    function saveTemplate() {
        const titleInput = document.getElementById('template-title-input');
        const contentInput = document.getElementById('template-content-input');
        const indexInput = document.getElementById('template-edit-index');
        const typeInput = document.getElementById('template-edit-type');
        const isProfileSpecificCheckbox = document.getElementById('template-is-profile-specific');

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();
        const index = parseInt(indexInput.value);
        const type = typeInput.value;
        const isProfileSpecific = isProfileSpecificCheckbox.checked;

        if (!title || !content) {
            showToast('Название и текст не могут быть пустыми', 'error');
            return;
        }

        if (isProfileSpecific && currentProfileName === 'Профиль не выбран') {
            showToast('Выберите профиль для сохранения', 'error');
            return;
        }

        const newTemplate = { title, content };

        if (index === -1) { // Создание нового
            if (isProfileSpecific) {
                currentSettings.templates.push(newTemplate);
                saveProfiles();
                showToast('Шаблон добавлен в профиль', 'success');
            } else {
                globalTemplates.push(newTemplate);
                saveGlobalTemplates();
                showToast('Общий шаблон добавлен', 'success');
            }
        } else { // Редактирование существующего
            const targetArray = type === 'profile' ? currentSettings.templates : globalTemplates;
            targetArray[index] = newTemplate;

            if (type === 'profile') {
                saveProfiles();
            } else {
                saveGlobalTemplates();
            }
            showToast('Шаблон обновлен', 'success');
        }

        renderTemplatesList();
        clearTemplateForm();
        const popup = document.getElementById('templates-popup');
        if (popup) popup.remove();
    }

    function editTemplate(index, type) {
        const checkbox = document.getElementById('template-is-profile-specific');
        const targetArray = type === 'profile' ? currentSettings.templates : globalTemplates;
        const template = targetArray[index];

        if (!template) return;

        document.getElementById('template-editor-title').textContent = 'Редактирование';
        document.getElementById('template-edit-index').value = index;
        document.getElementById('template-edit-type').value = type;
        document.getElementById('template-title-input').value = template.title;
        document.getElementById('template-content-input').value = template.content;

        checkbox.checked = type === 'profile';
        checkbox.disabled = true; // Запрещаем менять тип при редактировании
    }

    function deleteTemplate(index, type) {
        const targetArray = type === 'profile' ? currentSettings.templates : globalTemplates;
        if (!targetArray || !targetArray[index]) return;

        if (confirm(`Удалить шаблон "${targetArray[index].title}"?`)) {
            targetArray.splice(index, 1);

            if (type === 'profile') {
                saveProfiles();
            } else {
                saveGlobalTemplates();
            }

            renderTemplatesList();
            clearTemplateForm();
            showToast('Шаблон удален', 'success');
            const popup = document.getElementById('templates-popup');
            if (popup) popup.remove();
        }
    }

    function clearTemplateForm() {
        document.getElementById('template-editor-title').textContent = 'Новый шаблон';
        document.getElementById('template-edit-index').value = -1;
        document.getElementById('template-edit-type').value = 'global';
        document.getElementById('template-title-input').value = '';
        document.getElementById('template-content-input').value = '';
        const checkbox = document.getElementById('template-is-profile-specific');
        checkbox.checked = false;
        checkbox.disabled = false;
    }

    function uploadImageToCatbox(file, callback) {
        const formData = new FormData();
        formData.append("reqtype", "fileupload");
        formData.append("fileToUpload", file);
        GM_xmlhttpRequest({
            method: "POST", url: "https://catbox.moe/user/api.php", data: formData,
            onload: function(response) {
                if (response.status === 200 && response.responseText.trim().startsWith('http')) {
                    callback(response.responseText.trim());
                    showToast('Изображение загружено', 'success');
                } else {
                    showToast("Ошибка загрузки", 'error');
                }
            },
            onerror: function(err) { showToast("Ошибка соединения", 'error'); }
        });
    }

    function createTemplatesAccessButton() {
        const oldBtn = document.getElementById('templates-access-btn');
        if (oldBtn) oldBtn.remove();
        const oldSaveBtn = document.getElementById('quick-save-template-btn');
        if (oldSaveBtn) oldSaveBtn.remove();
        const inputContainer = document.querySelector('.flex.justify-between.items-end.py-sm.px-1.gap-0');
        if (!inputContainer) {
            setTimeout(createTemplatesAccessButton, 500);
            return;
        }
        const button = document.createElement('button');
        button.id = 'templates-access-btn';
        button.innerHTML = '📋';
        button.title = 'Быстрые ответы';
        button.style.cssText = `background: #4b5563; color: white; border: none; border-radius: 5px; width: 36px; height: 36px; cursor: pointer; font-size: 16px; margin-left: 5px;`;
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleTemplatesPopup(button);
        });

        const saveButton = document.createElement('button');
        saveButton.id = 'quick-save-template-btn';
        saveButton.innerHTML = '💾';
        saveButton.title = 'Сохранить как шаблон';
        saveButton.style.cssText = `background: #10b981; color: white; border: none; border-radius: 5px; width: 36px; height: 36px; cursor: pointer; font-size: 16px; margin-left: 5px;`;
        saveButton.addEventListener('mousedown', (e) => {
             e.preventDefault();
             e.stopPropagation();
             const textarea = document.querySelector('textarea[placeholder*="Напишите сообщение"]');
             if (textarea) {
                openQuickSaveModal(textarea.value);
             }
        });

        inputContainer.appendChild(button);
        inputContainer.appendChild(saveButton);
    }

    function toggleTemplatesPopup(button) {
        let popup = document.getElementById('templates-popup');
        if (popup) {
            popup.remove();
            return;
        }
        popup = document.createElement('div');
        popup.id = 'templates-popup';
        popup.style.cssText = `position: absolute; bottom: 50px; right: 10px; width: 250px; max-height: 300px; overflow-y: auto; background: #2d3748; border: 1px solid #4a5568; border-radius: 8px; z-index: 10001; box-shadow: 0 10px 30px rgba(0,0,0,0.4);`;

        const createTemplateItem = (template) => {
            const item = document.createElement('div');
            item.textContent = template.title;
            item.title = template.content;
            item.style.cssText = `padding: 10px 12px; color: white; font-size: 13px; cursor: pointer; border-bottom: 1px solid #4a5568;`;
            item.addEventListener('mouseenter', () => item.style.backgroundColor = '#4a5568');
            item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
            item.addEventListener('click', () => {
                const textarea = document.querySelector('textarea[placeholder*="Напишите сообщение"]');
                if (textarea) {
                    textarea.value += template.content;
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    textarea.focus();
                }
                popup.remove();
            });
            return item;
        };

        const addSection = (title, templates) => {
            popup.innerHTML += `<h5 style="padding: 8px 12px 4px; margin: 0; color: #9ca3af; font-size: 11px; font-weight: 600; text-transform: uppercase; background: #1f2937;">${title}</h5>`;
            if (templates.length === 0) {
                popup.innerHTML += `<div style="padding: 10px 12px; color: #6b7280; font-size: 12px;">Пусто</div>`;
            } else {
                templates.forEach(template => popup.appendChild(createTemplateItem(template)));
            }
        };

        const profileTemplates = (currentProfileName !== 'Профиль не выбран' && currentSettings.templates) ? currentSettings.templates : [];

        if (globalTemplates.length === 0 && profileTemplates.length === 0) {
             popup.innerHTML = `<div style="padding: 12px; text-align: center; color: #9ca3af; font-size: 13px;">Нет шаблонов.</div>`;
        } else {
            addSection('🌐 Общие', globalTemplates);
            if (currentProfileName !== 'Профиль не выбран') {
                 addSection(`👤 ${currentProfileName}`, profileTemplates);
            }
        }

        document.body.appendChild(popup);
        const closePopup = (e) => {
            if (!popup.contains(e.target) && e.target.id !== 'templates-access-btn') {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        };
        setTimeout(() => document.addEventListener('click', closePopup), 0);
    }

    // === БЫСТРОЕ СОХРАНЕНИЕ ШАБЛОНА ===
    function openQuickSaveModal(content) {
        if (!content || content.trim() === '') {
            showToast('Нечего сохранять', 'info');
            return;
        }

        let modal = document.getElementById('quick-save-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'quick-save-modal';
        modal.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            z-index: 10003; font-family: 'Inter', sans-serif;
        `;

        const defaultTitle = content.substring(0, 30).replace(/\n/g, ' ') + (content.length > 30 ? '...' : '');

        modal.innerHTML = `
            <div style="background: #2d3748; padding: 20px; border-radius: 10px; width: 400px; color: white; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                <h3 style="margin-top:0; text-align:center;">Быстрое сохранение шаблона</h3>
                <input type="text" id="quick-save-title" value="${defaultTitle}" style="width: 100%; padding: 8px; margin: 10px 0; border-radius: 5px; background: #1a202c; color: white; border:1px solid #4a5568;" placeholder="Название шаблона">
                <textarea id="quick-save-content" readonly style="width: 100%; height: 100px; padding: 8px; margin-bottom: 10px; border-radius: 5px; background: #1a202c; color: #9ca3af; border:1px solid #4a5568; resize: none;">${content}</textarea>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; background: rgba(255,255,255,0.05); border-radius: 5px; margin-bottom: 15px;" title="Если включено, шаблон будет виден только в текущем профиле">
                    <input type="checkbox" id="quick-save-is-profile" style="width: 15px; height: 15px; cursor: pointer;">
                    <span style="color: white; font-size: 12px; font-weight: 600;">Привязать к текущему профилю</span>
                </label>
                <div style="display: flex; gap: 10px;">
                    <button id="quick-save-btn" style="flex:1; padding: 8px; background: #10b981; color: white; border: none; border-radius: 5px; cursor: pointer;">Сохранить</button>
                    <button id="quick-cancel-btn" style="flex:1; padding: 8px; background: #4a5568; color: white; border: none; border-radius: 5px; cursor: pointer;">Отмена</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const isProfileSelected = currentProfileName !== 'Профиль не выбран';
        const checkbox = modal.querySelector('#quick-save-is-profile');
        if (!isProfileSelected) {
            checkbox.disabled = true;
            checkbox.parentElement.style.opacity = '0.5';
            checkbox.parentElement.title = 'Выберите профиль для использования этой опции';
        }

        modal.querySelector('#quick-cancel-btn').onclick = () => modal.remove();
        modal.querySelector('#quick-save-btn').onclick = () => {
            const title = modal.querySelector('#quick-save-title').value.trim();
            const isProfileSpecific = checkbox.checked;

            if (!title) {
                showToast('Название не может быть пустым', 'error');
                return;
            }

            const newTemplate = { title, content };

            if (isProfileSpecific) {
                currentSettings.templates.push(newTemplate);
                saveProfiles();
                showToast(`Шаблон "${title}" сохранен в профиль`, 'success');
            } else {
                globalTemplates.push(newTemplate);
                saveGlobalTemplates();
                showToast(`Общий шаблон "${title}" сохранен`, 'success');
            }

            if (document.getElementById('templates-modal')?.style.display === 'flex') {
                renderTemplatesList();
            }
            const popup = document.getElementById('templates-popup');
            if(popup) popup.remove();

            modal.remove();
        };
    }

    function addSaveTemplateButtonsToMessages() {
        const messages = document.querySelectorAll('div.w-full.flex.mb-lg .leading-6');
        messages.forEach(msgContent => {
            const parentBubble = msgContent.parentElement;
            if (!parentBubble || parentBubble.querySelector('.quick-save-from-chat-btn')) {
                return; // Already has a button or can't find parent
            }

            if (getComputedStyle(parentBubble).position === 'static') {
                parentBubble.style.position = 'relative';
            }

            const saveBtn = document.createElement('button');
            saveBtn.innerHTML = '💾';
            saveBtn.title = 'Сохранить как шаблон';
            saveBtn.className = 'quick-save-from-chat-btn';
            saveBtn.style.cssText = `
                position: absolute; top: 5px; right: 5px;
                background: rgba(16, 185, 129, 0.8); color: white; border: none;
                border-radius: 5px; width: 28px; height: 28px;
                cursor: pointer; font-size: 14px; opacity: 0;
                transition: opacity 0.2s; z-index: 10;
            `;

            parentBubble.addEventListener('mouseenter', () => saveBtn.style.opacity = '1');
            parentBubble.addEventListener('mouseleave', () => saveBtn.style.opacity = '0');

            saveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const clone = msgContent.cloneNode(true);
                clone.querySelectorAll('.quick-save-from-chat-btn').forEach(el => el.remove());
                const textToSave = clone.innerText.trim();
                openQuickSaveModal(textToSave);
            });
            parentBubble.appendChild(saveBtn);
        });
    }

    function applyStyles() {
        if (!isChatPage()) {
            if (styleElement) styleElement.textContent = '';
            return;
        }
        if (!currentSettings) {
            if (styleElement) styleElement.textContent = '';
            return;
        }

        let fontToLoad = currentSettings.fontFamily;
        if (currentSettings.customFontName && currentSettings.customFontName.trim() !== '') {
            fontToLoad = currentSettings.customFontName.trim();
            currentSettings.isGoogleFont = true;
        }
        if (currentSettings.isGoogleFont) loadGoogleFont(fontToLoad);

        let finalBgUrl = currentSettings.backgroundImage;
        if (currentSettings.useAvatarAsBackground) {
            const avatarUrl = findAvatarImage();
            if (avatarUrl) finalBgUrl = avatarUrl;
            else setTimeout(applyStyles, 1000);
        }

        const alpha = currentSettings.chatOpacity / 100;
        const blurPx = currentSettings.blurAmount;
        const radius = currentSettings.bubbleRadius;
        const chatMaxWidth = ORIGINAL_VALUES.CHAT_WIDTH * (currentSettings.chatWidth / 100);
        const inputMaxWidth = ORIGINAL_VALUES.INPUT_WIDTH * (currentSettings.inputWidth / 100);

        let css = '';

        css += `.w-full.flex.mb-lg.bg-transparent[style*="max-width: 800px"] { max-width: ${chatMaxWidth}px !important; padding: 10px !important; }\n`;
        css += `.mb-lg.bg-transparent > div.flex.flex-col.gap-md.w-full { max-width: 100% !important; width: 100% !important; }\n`;
        css += `.flex.justify-undefined.items-undefined.bg-transparent.w-full.right-0.pb-md.z-\\[1\\][style*="max-width: 800px"] { max-width: ${inputMaxWidth}px !important; padding: 10px !important; margin-bottom: 10px !important; }\n`;

        if (currentSettings.cinemaMode) {
            css += `
                aside, nav, .hidden.md\\:flex.flex-col, div[class*="w-[280px]"] { display: none !important; }
                header, .sticky.top-0.z-20, .h-16.border-b, div.sticky.top-0.z-\\[100\\] { display: none !important; }
                main { padding-left: 0 !important; margin-left: 0 !important; max-width: 100% !important; padding-top: 0 !important; }
                .h-\\[calc\\(100vh-64px\\)\\] { height: 100vh !important; }
            `;
        } else {
            css += `
                .sticky.top-0, header, .z-10.w-full.bg-gray-2, div.sticky.top-0.z-\\[100\\] {
                    background-color: rgba(17, 24, 39, ${alpha > 0.85 ? 0.85 : alpha}) !important;
                    backdrop-filter: blur(${blurPx + 10}px) !important;
                    border-bottom: 1px solid rgba(255,255,255,0.1) !important;
                }
            `;
        }

        if (finalBgUrl) {
            css += `
                .flex.grow.flex-col.top-0.left-0.w-full.h-full.bg-gray-2 {
                    background-image: url('${finalBgUrl}') !important;
                    background-size: ${currentSettings.backgroundSize || 'cover'} !important;
                    background-position: center !important;
                    background-attachment: fixed !important;
                    background-repeat: ${currentSettings.backgroundRepeat || 'no-repeat'} !important;
                    background-color: #111827 !important;
                    filter: brightness(${currentSettings.backgroundBrightness}%) contrast(${currentSettings.backgroundContrast}%) saturate(${currentSettings.backgroundSaturation}%) !important;
                }
                .flex.justify-undefined.items-undefined.w-full.bg-gray-2.py-0.px-2.z-\\[2\\].items-center.flex-col,
                .flex.justify-undefined.items-undefined.w-full.bg-gray-2,
                .overflow-auto.custom-scroll,
                .overflow-auto.custom-scroll > div,
                .flex.flex-col.justify-undefined.items-undefined.grow.relative.w-full,
                .flex.justify-undefined.items-undefined.items-center.p-md.w-full,
                .flex.justify-undefined.items-undefined.bg-transparent.w-full.right-0.pb-md.z-\\[1\\] {
                    background-color: transparent !important;
                    border-bottom: none !important;
                }
                textarea.bg-transparent { background-color: transparent !important; }
            `;
        }

        let commonProps = `backdrop-filter: blur(${blurPx}px) !important; border-radius: ${radius}px !important;`;

        if (currentSettings.useCustomColors) {
            const botRgb = hexToRgb(currentSettings.botMsgColor);
            const userRgb = hexToRgb(currentSettings.userMsgColor);
            const inputRgb = hexToRgb(currentSettings.inputBgColor);

            let botBg, userBg;
            if (currentSettings.useGradient) {
                 const botRgb2 = hexToRgb(currentSettings.botMsgColor2);
                 const userRgb2 = hexToRgb(currentSettings.userMsgColor2);
                 const angle = currentSettings.gradientAngle;
                 botBg = `linear-gradient(${angle}deg, rgba(${botRgb.r}, ${botRgb.g}, ${botRgb.b}, ${alpha}), rgba(${botRgb2.r}, ${botRgb2.g}, ${botRgb2.b}, ${alpha}))`;
                 userBg = `linear-gradient(${angle}deg, rgba(${userRgb.r}, ${userRgb.g}, ${userRgb.b}, ${alpha}), rgba(${userRgb2.r}, ${userRgb2.g}, ${userRgb2.b}, ${alpha}))`;
            } else {
                 botBg = `rgba(${botRgb.r}, ${botRgb.g}, ${botRgb.b}, ${alpha})`;
                 userBg = `rgba(${userRgb.r}, ${userRgb.g}, ${userRgb.b}, ${alpha})`;
            }
            const inputBg = `rgba(${inputRgb.r}, ${inputRgb.g}, ${inputRgb.b}, ${alpha})`;

            const botProp = currentSettings.useGradient ? 'background-image' : 'background-color';
            const userProp = currentSettings.useGradient ? 'background-image' : 'background-color';

            // Сообщения бота (исключая поле ввода)
            css += `
                .bg-gray-4:not(.w-full.border-1), .bg-gray-3:not(.w-full.border-1) {
                    ${botProp}: ${botBg} !important; ${commonProps}
                }
                .bg-gray-4:not(.w-full.border-1), .bg-gray-3:not(.w-full.border-1),
                .bg-gray-4:not(.w-full.border-1) *, .bg-gray-3:not(.w-full.border-1) * {
                    color: ${currentSettings.botTextColor} !important;
                }
                .bg-gray-4:not(.w-full.border-1) em, .bg-gray-3:not(.w-full.border-1) em,
                .bg-gray-4:not(.w-full.border-1) i, .bg-gray-3:not(.w-full.border-1) i {
                    color: ${currentSettings.botItalicColor} !important;
                }

                .bg-blumine-6, .bg-accent-blue, .dark\\:bg-blumine-3 {
                    ${userProp}: ${userBg} !important; ${commonProps}
                }
                .bg-blumine-6, .bg-accent-blue, .bg-blumine-6 *, .bg-accent-blue * {
                    color: ${currentSettings.userTextColor} !important;
                }
                .bg-blumine-6 em, .bg-accent-blue em, .bg-blumine-6 i, .bg-accent-blue i {
                    color: ${currentSettings.userItalicColor} !important;
                }

                /* Поле ввода */
                .w-full.border-1.border-solid.rounded-\\[13px\\].bg-gray-3 {
                    background-color: ${inputBg} !important; ${commonProps}
                }
            `;
        } else {
            css += `
                .bg-gray-4, .bg-gray-3, .bg-blumine-6, .bg-accent-blue, .dark\\:bg-blumine-3,
                .w-full.border-1.border-solid.rounded-\\[13px\\].bg-gray-3 {
                    --tw-bg-opacity: ${alpha} !important; ${commonProps}
                }
            `;
        }

        if (currentSettings.textShadow) {
            css += `body, p, span, div, h1, h2, h3, h4, h5, h6, a, button, label, textarea { text-shadow: 0px 1px 2px rgba(0,0,0,1), 0px 0px 5px rgba(0,0,0,0.8) !important; }`;
        }

        const newFontSize = 16 * (currentSettings.fontSize / 100);
        const align = currentSettings.messageAlign;
        const fontName = currentSettings.customFontName || currentSettings.fontFamily;
        css += `
            div.mb-lg.bg-transparent span.leading-6, div.mb-lg.bg-transparent em, div.mb-lg.bg-transparent i,
            div.mb-lg.bg-transparent strong, div.mb-lg.bg-transparent b, div.mb-lg.bg-transparent u {
                font-size: ${newFontSize}px !important; font-family: '${fontName}', sans-serif !important;
                line-height: 1.5 !important; text-align: ${align} !important;
            }
        `;

        if (currentSettings.inputHeight !== 100) {
            const heightMultiplier = currentSettings.inputHeight / 100;
            const newTextareaMinHeight = ORIGINAL_VALUES.TEXTAREA_MIN_HEIGHT * heightMultiplier;
            const newTextareaMaxHeight = ORIGINAL_VALUES.TEXTAREA_MAX_HEIGHT * heightMultiplier;
            const newContainerHeight = ORIGINAL_VALUES.CONTAINER_HEIGHT * heightMultiplier;

            css += `textarea {
                min-height: ${newTextareaMinHeight}px !important;
                max-height: ${newTextareaMaxHeight}px !important;
                height: auto !important;
                align-self: flex-start !important;
                margin-top: 0 !important;
            }\n`;

            css += `.flex-grow.max-h-\\[188px\\] {
                max-height: ${newTextareaMaxHeight}px !important;
                align-items: flex-start !important;
            }\n`;

            css += `.w-full.border-1.border-solid.rounded-\\[13px\\].bg-gray-3 {
                min-height: ${newContainerHeight}px !important;
            }\n`;

            css += `.flex.justify-between.items-end.py-sm.px-1.gap-0 {
                min-height: ${newContainerHeight - 16}px !important;
                align-items: flex-start !important;
            }\n`;

            css += `.flex.flex-1.items-end.gap-1 {
                min-height: ${newTextareaMinHeight}px !important;
                align-items: flex-start !important;
            }\n`;

            css += `.flex.items-center.justify-center {
                align-items: flex-start !important;
            }\n`;

            css += `textarea::placeholder { line-height: normal !important; }\n`;
        }

        if (currentSettings.headerAvatarSize === 'medium') {
            css += `div.flex.flex-col.justify-undefined img[width="80"] { width: 150px !important; height: auto !important; max-width: 100%; border-radius: 12px !important; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }\n`;
            updateHeaderAvatarSrc();
        } else if (currentSettings.headerAvatarSize === 'large') {
             css += `div.flex.flex-col.justify-undefined img[width="80"] { width: 300px !important; height: auto !important; max-width: 100%; border-radius: 16px !important; box-shadow: 0 8px 25px rgba(0,0,0,0.5); }\n`;
            updateHeaderAvatarSrc();
        }

        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'spicychat-custom-styles';
            document.head.appendChild(styleElement);
        }
        styleElement.textContent = css;
    }

    function updateHeaderAvatarSrc() {
        const headerImage = document.querySelector('div.flex.flex-col.justify-undefined img[width="80"]');
        if (headerImage && headerImage.src.includes('?')) {
            headerImage.src = headerImage.src.split('?')[0];
        }
    }

    function downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename.endsWith('.html') ? filename : `${filename}.html`; a.click(); URL.revokeObjectURL(url);
    }

    function generateExportHTML() {
        let messages = document.querySelectorAll('div.w-full.flex.mb-lg');
        if (messages.length === 0) messages = document.querySelectorAll('.flex.flex-col.gap-md > div.flex.w-full');
        if (messages.length === 0) return null;

        const headerSelector = '.flex.flex-col.justify-undefined.items-undefined.py-md.pt-lg.px-lg.max-mob\\:px-0.gap-sm.items-center.w-full';
        let headerHTML = '<h1 style="text-align:center; color:white;">SpicyChat Export</h1>';
        const headerContainer = document.querySelector(headerSelector);
        if (headerContainer) {
            const cloneHeader = headerContainer.cloneNode(true);
            const smallImg = cloneHeader.querySelector('img[width="80"]');
            if (smallImg) {
                const hdSrc = findAvatarImage();
                if (hdSrc) { smallImg.src = hdSrc; smallImg.removeAttribute('width'); smallImg.removeAttribute('height'); smallImg.style.width = '150px'; smallImg.style.height = 'auto'; smallImg.style.borderRadius = '12px'; }
            }
            headerHTML = cloneHeader.outerHTML;
        }

        let botColor = '#1f2937'; let userColor = '#2563eb';
        const botMsgSample = document.querySelector('div.w-full.flex.mb-lg:not(.flex-row-reverse) .bg-gray-3');
        if (botMsgSample) botColor = window.getComputedStyle(botMsgSample).backgroundColor;
        const userMsgSample = document.querySelector('div.w-full.flex.mb-lg.flex-row-reverse .bg-accent-blue');
        if (userMsgSample) userColor = window.getComputedStyle(userMsgSample).backgroundColor;

        let html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>SpicyChat Export</title><script src="https://cdn.tailwindcss.com"></script><style>body{font-family:'Inter',system-ui,sans-serif;background:#0f111a;color:#e5e7eb;padding:20px;margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center}.main-wrapper{width:100%;max-width:900px;margin:0 auto}.chat-container{display:flex;flex-direction:column;gap:20px;margin-top:40px}.message{display:flex;gap:15px;align-items:flex-start}.message.user{flex-direction:row-reverse}.avatar{width:40px;height:40px;border-radius:50%;object-fit:cover;background:#374151;flex-shrink:0}.content{max-width:80%}.name{font-weight:600;margin-bottom:4px;font-size:0.9em;color:#d1d5db}.message.user .name{text-align:right;display:none}.bubble{padding:12px 16px;border-radius:8px;line-height:1.6;position:relative;white-space:pre-wrap;font-size:15px}.message:not(.user) .bubble{background-color:${botColor};color:#d1d5db;border-top-left-radius:2px}.message.user .bubble{background-color:${userColor};color:white;border-top-right-radius:2px}a{color:#60a5fa;text-decoration:none}em{font-style:italic;opacity:0.9}</style></head><body><div class="main-wrapper"><div class="chat-header">${headerHTML}</div><div class="chat-container">`;

        messages.forEach((msg) => {
            try {
                const isUser = msg.className.includes('flex-row-reverse') || msg.querySelector('.justify-end') !== null;
                let name = "Character"; let avatarSrc = 'https://via.placeholder.com/40';
                const imgTag = msg.querySelector('img'); if (imgTag && imgTag.src) avatarSrc = imgTag.src;

                const contentDiv = msg.querySelector('.leading-6') || msg.querySelector('.text-body-md');
                let cleanText = "";
                if (contentDiv) {
                    const clone = contentDiv.cloneNode(true); clone.querySelectorAll('.text-xs, button, svg, .absolute').forEach(el => el.remove());
                    cleanText = clone.innerText.trim().replace(/\s*\d+\s*\/\s*\d+\s*$/, '');
                } else { cleanText = msg.innerText.trim(); }

                if (cleanText) { html += `<div class="message ${isUser ? 'user' : ''}"><img src="${avatarSrc}" class="avatar" alt="${name}"><div class="content"><div class="bubble">${cleanText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div></div></div>`; }
            } catch (e) { console.error(e); }
        });
        html += `</div></div></body></html>`; return html;
    }

    function initiateExport() {
        let charName = "SpicyChat_Export"; const pTag = document.querySelector('p.text-label-lg');
        if (pTag) charName = pTag.innerText.trim().replace(/[^a-zA-Z0-9а-яА-Я _-]/g, '');
        const modal = document.createElement('div');
        modal.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10003; font-family: 'Inter', sans-serif;`;
        modal.innerHTML = `
            <div style="background: #2d3748; padding: 20px; border-radius: 10px; width: 350px; color: white; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                <h3 style="margin-top:0; text-align:center;">Экспорт чата</h3>
                <input type="text" id="export-filename" value="${charName}" style="width: 100%; padding: 8px; margin: 15px 0; border-radius: 5px; background: #1a202c; color: white; border:1px solid #4a5568;">
                <div style="display: flex; gap: 10px;">
                    <button id="modal-save" style="flex:1; padding: 8px; background: #805ad5; color: white; border: none; border-radius: 5px; cursor: pointer;">Сохранить</button>
                    <button id="modal-cancel" style="flex:1; padding: 8px; background: #4a5568; color: white; border: none; border-radius: 5px; cursor: pointer;">Отмена</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.querySelector('#modal-cancel').onclick = () => modal.remove();
        modal.querySelector('#modal-save').onclick = () => {
            const fn = modal.querySelector('#export-filename').value.trim() || 'Chat_Export';
            const content = generateExportHTML();
            if(content) {
                downloadFile(content, fn);
                showToast('Чат экспортирован', 'success');
            } else {
                showToast('Ошибка экспорта', 'error');
            }
            modal.remove();
        };
    }

    function createButtons() {
        const btnGear = document.createElement('div'); btnGear.id = 'spicychat-editor-button'; btnGear.innerHTML = '⚙️'; btnGear.title = 'Настройки (Ctrl+Shift+S)';
        btnGear.style.cssText = `position: fixed; top: 50%; right: 20px; transform: translateY(-50%); width: 40px; height: 40px; background: #3182ce; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; z-index: 10000; font-size: 18px; box-shadow: 0 2px 10px rgba(0,0,0,0.3); transition: right 0.3s ease;`;
        btnGear.addEventListener('click', togglePanel); document.body.appendChild(btnGear);

        const btnCinema = document.createElement('div'); btnCinema.id = 'spicychat-cinema-button'; btnCinema.innerHTML = '🎬'; btnCinema.title = 'Режим Кинотеатра (Ctrl+Shift+C)';
        btnCinema.style.cssText = `position: fixed; top: calc(50% + 50px); right: 20px; transform: translateY(-50%); width: 40px; height: 40px; background: #e53e3e; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; cursor: pointer; z-index: 10000; font-size: 18px; box-shadow: 0 2px 10px rgba(0,0,0,0.3); transition: right 0.3s ease;`;
        btnCinema.addEventListener('click', () => {
            currentSettings.cinemaMode = !currentSettings.cinemaMode;
            applyStyles();
            saveProfiles();
            showToast(currentSettings.cinemaMode ? 'Режим кинотеатра включен' : 'Режим кинотеатра выключен', 'success');
            const visualModal = document.getElementById('visual-settings-modal');
            if (visualModal) {
                const chk = visualModal.querySelector('#visual-cinema-mode');
                if (chk) chk.checked = currentSettings.cinemaMode;
            }
        });
        document.body.appendChild(btnCinema);

        const resetHideTimer = () => {
            if (isPanelOpen) return; btnGear.style.right = '20px'; btnGear.style.opacity = '1'; btnCinema.style.right = '20px'; btnCinema.style.opacity = '1';
            clearTimeout(hideButtonTimeout); hideButtonTimeout = setTimeout(() => { if (!isPanelOpen) { btnGear.style.right = '-28px'; btnGear.style.opacity = '0.5'; btnCinema.style.right = '-28px'; btnCinema.style.opacity = '0.5'; } }, 5000);
        };
        [btnGear, btnCinema].forEach(b => { b.addEventListener('mouseenter', resetHideTimer); b.addEventListener('click', resetHideTimer); });
        resetHideTimer();
    }

    function createPanel() {
        const panel = document.createElement('div'); panel.id = 'spicychat-editor-panel';
        const padding = compactMode ? '14px' : '20px';
        const width = compactMode ? '340px' : '400px';
        const fontSize = compactMode ? '12px' : '14px';
        const titleSize = compactMode ? '16px' : '19px';

        panel.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(31, 41, 55, 0.98); backdrop-filter: blur(20px); padding: ${padding}; border-radius: 10px; z-index: 9999; color: white; width: ${width}; display: none; font-family: 'Inter', sans-serif; font-size: ${fontSize}; box-shadow: 0 20px 60px rgba(0,0,0,0.7); border: 1px solid rgba(255, 255, 255, 0.15);`;

        panel.innerHTML = `
            <div id="panel-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:${
compactMode ? '14px' : '20px'}; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:${compactMode ? '12px' : '16px'};">
                <h3 style="margin:0; font-size:${titleSize}; font-weight:700; color: #ffffff;">${compactMode ? '⚙️' : '🛠️ SpicyChat Editor'} <span style="font-size:${compactMode ? '10px' : '12px'}; color:#9ca3af;">V5.7.2</span></h3>
                <div style="display:flex; gap:6px; align-items:center;">
                    <button id="btn-compact-mode" title="${compactMode ? 'Обычный режим' : 'Компактный режим'}" style="background:rgba(255,255,255,0.1); border:none; color:white; font-size:14px; cursor:pointer; border-radius:5px; width:28px; height:28px;">${compactMode ? '⬜' : '▪️'}</button>
                    <button id="btn-close" title="Закрыть (Escape)" style="background:rgba(255,255,255,0.1); border:none; color:white; font-size:20px; cursor: pointer; border-radius:5px; width:28px; height:28px;">×</button>
                </div>
            </div>

            <div style="background:rgba(96,165,250,0.1); padding:${compactMode ? '10px' : '13px'}; border-radius:7px; margin-bottom:${compactMode ? '12px' : '16px'}; border: 1px solid rgba(96,165,250,0.2);">
                <div style="margin-bottom:${compactMode ? '7px' : '9px'}; display:flex; gap:${compactMode ? '5px' : '7px'};">
                    <select id="profile-select" title="Выбрать профиль" style="flex:1; padding:${compactMode ? '5px' : '7px'}; background:#374151; color:white; border:1px solid #4b5563; border-radius:5px; font-size:${compactMode ? '11px' : '13px'};"></select>
                </div>
                <div style="display:flex; gap:${compactMode ? '5px' : '7px'};">
                    <input type="text" id="new-profile-name" placeholder="${compactMode ? 'Имя...' : 'Имя профиля...'}" title="Введите имя нового профиля" style="flex:1; padding:${compactMode ? '5px' : '7px'}; background:#374151; color:white; border:1px solid #4b5563; border-radius:5px; font-size:${compactMode ? '11px' : '13px'};">
                    <button id="btn-save-profile" title="Сохранить профиль" style="background:#10b981; border:none; border-radius:5px; color:white; width:${compactMode ? '28px' : '34px'}; font-size:${compactMode ? '13px' : '15px'}; cursor:pointer;">💾</button>
                    <button id="btn-duplicate-profile" title="Дублировать профиль" style="background:#3b82f6; border:none; border-radius:5px; color:white; width:${compactMode ? '28px' : '34px'}; font-size:${compactMode ? '13px' : '15px'}; cursor:pointer;">📋</button>
                    <button id="btn-rename-profile" title="Переименовать профиль" style="background:#8b5cf6; border:none; border-radius:5px; color:white; width:${compactMode ? '28px' : '34px'}; font-size:${compactMode ? '13px' : '15px'}; cursor:pointer;">✏️</button>
                    <button id="btn-delete-profile" title="Удалить профиль" style="background:#ef4444; border:none; border-radius:5px; color:white; width:${compactMode ? '28px' : '34px'}; font-size:${compactMode ? '13px' : '15px'}; cursor:pointer;">🗑️</button>
                </div>
                <div style="display:flex; gap:${compactMode ? '5px' : '7px'}; margin-top:${compactMode ? '7px' : '9px'};">
                    <button id="btn-export-all" title="Экспорт всех профилей" style="flex:1; background:#10b981; border:none; border-radius:5px; color:white; padding:${compactMode ? '5px' : '7px'}; font-size:${compactMode ? '11px' : '12px'}; cursor:pointer; font-weight:600;">📥</button>
                    <button id="btn-export-single" title="Экспорт текущего профиля" style="flex:1; background:#14b8a6; border:none; border-radius:5px; color:white; padding:${compactMode ? '5px' : '7px'}; font-size:${compactMode ? '11px' : '12px'}; cursor:pointer; font-weight:600;">📄</button>
                    <button id="btn-import" title="Импорт профилей" style="flex:1; background:#f59e0b; border:none; border-radius:5px; color:white; padding:${compactMode ? '5px' : '7px'}; font-size:${compactMode ? '11px' : '12px'}; cursor:pointer; font-weight:600;">📤</button>
                </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:${compactMode ? '8px' : '11px'};">
                <button id="btn-open-text-settings" title="Настройки текста и шрифтов" style="width:100%; padding:${compactMode ? '9px' : '12px'}; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color:white; border:none; border-radius:7px; cursor:pointer; font-weight:600; font-size:${compactMode ? '12px' : '14px'}; box-shadow: 0 4px 12px rgba(139,92,246,0.3);">
                    ${compactMode ? '🔤' : '🔤 Настройки текста'}
                </button>

                <button id="btn-open-visual-settings" title="Визуальные настройки и фон" style="width:100%; padding:${compactMode ? '9px' : '12px'}; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color:white; border:none; border-radius:7px; cursor:pointer; font-weight:600; font-size:${compactMode ? '12px' : '14px'}; box-shadow: 0 4px 12px rgba(59,130,246,0.3);">
                    ${compactMode ? '🎨' : '🎨 Визуальные настройки'}
                </button>

                <button id="btn-open-templates" title="Шаблоны / Быстрые ответы" style="width:100%; padding:${compactMode ? '9px' : '12px'}; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color:white; border:none; border-radius:7px; cursor:pointer; font-weight:600; font-size:${compactMode ? '12px' : '14px'}; box-shadow: 0 4px 12px rgba(245,158,11,0.3);">
                    ${compactMode ? '📋' : '📋 Шаблоны'}
                </button>
            </div>

            <div style="margin-top:${compactMode ? '12px' : '16px'}; padding-top:${compactMode ? '12px' : '15px'}; border-top:1px solid rgba(255,255,255,0.15);">
                <button id="btn-export" title="Экспорт чата в HTML (Ctrl+Shift+E)" style="width:100%; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color:white; padding:${compactMode ? '9px' : '11px'}; border:none; border-radius:7px; cursor:pointer; font-weight:600; font-size:${compactMode ? '12px' : '14px'}; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">${compactMode ? '📥 Экспорт' : '📥 Экспорт HTML'}</button>
            </div>
        `;

        document.body.appendChild(panel);

        applyModalPosition(panel);
        makeDraggable(panel, panel.querySelector('#panel-header'));

        setupPanelHandlers(panel);
        updatePanelUI();
    }

    function setupPanelHandlers(panel) {
        panel.querySelector('#btn-open-text-settings').addEventListener('click', openTextSettingsModal);
        panel.querySelector('#btn-open-visual-settings').addEventListener('click', openVisualSettingsModal);
        panel.querySelector('#btn-open-templates').addEventListener('click', openTemplatesModal);

        const updateProfilesList = () => {
            let options = '<option value="Профиль не выбран"' + (currentProfileName === 'Профиль не выбран' ? ' selected' : '') + '>Профиль не выбран</option>' + Object.keys(profiles).map(name => `<option value="${name}" ${currentProfileName === name ? 'selected' : ''}>${name}</option>`).join('');
            panel.querySelector('#profile-select').innerHTML = options;
        };

        panel.querySelector('#profile-select').addEventListener('change', (e) => {
            const name = e.target.value;
            currentProfileName = name;
            if (name !== 'Профиль не выбран' && profiles[name]) {
                currentSettings = {...profiles[name]};
            } else {
                currentSettings = {...DEFAULT_SETTINGS};
            }
            saveProfiles();
            applyStyles();
            updatePanelUI();
        });

        panel.querySelector('#btn-save-profile').addEventListener('click', () => {
            const name = panel.querySelector('#new-profile-name').value.trim();
            if (name) {
                profiles[name] = {...currentSettings};
                currentProfileName = name;
                updateProfilesList();
                saveProfiles();
                showToast('Профиль сохранён: ' + name, 'success');
                panel.querySelector('#new-profile-name').value = '';
            } else if (currentProfileName !== 'Профиль не выбран') {
                profiles[currentProfileName] = {...currentSettings};
                saveProfiles();
                showToast('Профиль обновлён: ' + currentProfileName, 'success');
            }
        });

        panel.querySelector('#btn-duplicate-profile').addEventListener('click', () => {
            if (currentProfileName === 'Профиль не выбран') {
                showToast('Выберите профиль для дублирования', 'error');
            } else {
                duplicateProfile(currentProfileName);
                updateProfilesList();
            }
        });

        panel.querySelector('#btn-rename-profile').addEventListener('click', () => {
            if (currentProfileName === 'Профиль не выбран') {
                showToast('Выберите профиль для переименования', 'error');
            } else {
                renameProfile(currentProfileName);
                updateProfilesList();
            }
        });

        panel.querySelector('#btn-delete-profile').addEventListener('click', () => {
            if (currentProfileName === 'Профиль не выбран') {
                showToast('Выберите профиль для удаления', 'error');
            } else if (confirm('Удалить профиль "' + currentProfileName + '"?')) {
                delete profiles[currentProfileName];
                currentProfileName = 'Профиль не выбран';
                currentSettings = {...DEFAULT_SETTINGS};
                updateProfilesList();
                saveProfiles();
                applyStyles();
                updatePanelUI();
                showToast('Профиль удалён', 'success');
            }
        });

        panel.querySelector('#btn-export-all').addEventListener('click', () => {
            exportProfiles();
        });

        panel.querySelector('#btn-export-single').addEventListener('click', () => {
            if (currentProfileName === 'Профиль не выбран') {
                showToast('Выберите профиль для экспорта', 'error');
            } else {
                exportSingleProfile(currentProfileName);
            }
        });

        panel.querySelector('#btn-import').addEventListener('click', () => {
            importProfiles();
            updateProfilesList();
        });

        panel.querySelector('#btn-compact-mode').addEventListener('click', () => {
            compactMode = !compactMode;
            GM_setValue('spicychat_compact_mode', compactMode);
            showToast(compactMode ? 'Компактный режим включен' : 'Обычный режим', 'success');

            panel.remove();
            createPanel();
            const newPanel = document.getElementById('spicychat-editor-panel');
            if (newPanel && isPanelOpen) {
                newPanel.style.display = 'block';
            }
        });

        panel.querySelector('#btn-close').addEventListener('click', togglePanel);
        panel.querySelector('#btn-export').addEventListener('click', initiateExport);
    }

    function updatePanelUI() {
        if (!isPanelOpen) return;
        const panel = document.getElementById('spicychat-editor-panel');
        if(!panel) return;

        let options = '<option value="Профиль не выбран"' + (currentProfileName === 'Профиль не выбран' ? ' selected' : '') + '>Профиль не выбран</option>' + Object.keys(profiles).map(name => `<option value="${name}" ${currentProfileName === name ? 'selected' : ''}>${name}</option>`).join('');
        panel.querySelector('#profile-select').innerHTML = options;
    }

    function togglePanel() {
        let panel = document.getElementById('spicychat-editor-panel');
        const btn = document.getElementById('spicychat-editor-button');
        if (!isPanelOpen) {
            if (!panel) {
                createPanel();
                panel = document.getElementById('spicychat-editor-panel');
            }
            panel.style.display = 'block';
            isPanelOpen = true;
            if (btn) {
                btn.style.right = '20px';
                btn.style.opacity = '1';
                clearTimeout(hideButtonTimeout);
            }
            updatePanelUI();
        }
        else {
            if (panel) panel.style.display = 'none';
            isPanelOpen = false;
            if (btn) {
                const event = new Event('mouseleave');
                btn.dispatchEvent(event);
            }
        }
    }

    function saveProfiles() {
        try {
            const safeProfiles = {};
            Object.keys(profiles).forEach(key => {
                safeProfiles[safeEncode(key)] = profiles[key];
            });
            GM_setValue('spicychat_profiles_v4', JSON.stringify(safeProfiles));
            GM_setValue('spicychat_current_profile_v4', safeEncode(currentProfileName));
        } catch (error) {
            console.error(error);
        }
    }

    function loadProfiles() {
        try {
            const saved = GM_getValue('spicychat_profiles_v4', null);
            if (saved) {
                const raw = JSON.parse(saved);
                profiles = {};
                Object.keys(raw).forEach(k => {
                    const profile = raw[k];
                    // Применение значений по умолчанию для новых настроек к старым профилям
                    const defaultKeys = Object.keys(DEFAULT_SETTINGS);
                    defaultKeys.forEach(key => {
                        if (!profile.hasOwnProperty(key)) {
                            profile[key] = DEFAULT_SETTINGS[key];
                        }
                    });
                    profiles[safeDecode(k)] = profile;
                });
            } else {
                profiles = { 'Мой профиль': {...DEFAULT_SETTINGS} };
            }
            currentProfileName = safeDecode(GM_getValue('spicychat_current_profile_v4', 'Профиль не выбран'));
            if (currentProfileName !== 'Профиль не выбран' && profiles[currentProfileName]) {
                currentSettings = {...profiles[currentProfileName]};
                 Object.keys(DEFAULT_SETTINGS).forEach(key => {
                    if (!currentSettings.hasOwnProperty(key)) {
                        currentSettings[key] = DEFAULT_SETTINGS[key];
                    }
                });
            } else {
                currentSettings = {...DEFAULT_SETTINGS};
            }
        } catch (e) {
            console.error('Load profiles error:', e);
            currentSettings = {...DEFAULT_SETTINGS};
        }
    }

    function setupHotkeys() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                togglePanel();
            }

            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                currentSettings.cinemaMode = !currentSettings.cinemaMode;
                applyStyles();
                saveProfiles();
                showToast(currentSettings.cinemaMode ? 'Режим кинотеатра включен' : 'Режим кинотеатра выключен', 'success');
            }

            if (e.ctrlKey && e.shiftKey && e.key === 'E') {
                e.preventDefault();
                initiateExport();
            }

            if (e.key === 'Escape') {
                if (isPanelOpen) {
                    togglePanel();
                }
            }
        });
    }

    function init() {
        runTemplateMigration();
        loadProfiles();
        loadFavoriteFonts();
        loadGlobalTemplates();
        loadModalPositions();

        compactMode = GM_getValue('spicychat_compact_mode', false);

        if (isChatPage()) {
            createButtons();
            createTemplatesAccessButton();
        }
        applyStyles();
        setupHotkeys();

        observer = new MutationObserver(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                if (isChatPage()) {
                    if(!document.getElementById('spicychat-editor-button')) createButtons();
                    applyStyles();
                    createTemplatesAccessButton();
                } else {
                    const btn = document.getElementById('spicychat-editor-button');
                    if(btn) btn.remove();
                    const btnCin = document.getElementById('spicychat-cinema-button');
                    if(btnCin) btnCin.remove();
                    if(styleElement) styleElement.textContent = '';
                }
            } else {
                if(isChatPage() && !document.getElementById('templates-access-btn')) {
                    createTemplatesAccessButton();
                }
            }
            addSaveTemplateButtonsToMessages();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        addSaveTemplateButtonsToMessages();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
