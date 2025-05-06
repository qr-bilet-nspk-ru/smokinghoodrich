document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.expand();
    tg.enableClosingConfirmation();

    // Элементы
    const elements = {
        unlockPhase: document.getElementById('unlock-phase'),
        scrollPhase: document.getElementById('scroll-phase'),
        resultPhase: document.getElementById('result-phase'),
        progressBar: document.getElementById('progress-bar'),
        multiTrackContainer: document.getElementById('multi-track-container'),
        multiResultContainer: document.getElementById('multi-result-container'),
        continueBtn: document.getElementById('continue-btn'),
        balanceEl: document.getElementById('balance'),
        profileBalance: document.getElementById('profile-balance'),
        freeCaseTimer: document.getElementById('free-case-timer'),
        caseImage: document.querySelector('.case-image'),
        themeToggle: document.getElementById('theme-toggle'),
        inventoryModal: document.getElementById('inventory-modal'),
        inventoryItems: document.getElementById('inventory-items'),
        closeInventory: document.getElementById('close-inventory'),
        totalOpened: document.getElementById('total-opened'),
        openOptions: document.querySelectorAll('.open-option'),
        openBtn: document.getElementById('open-btn'),
        profileBtn: document.getElementById('profile-btn')
    };

    // Предметы
    const items = [
        { name: "🍉 Арбуз", image: "images/items/watermelon.png", flavor: "Сочный летний вкус", strength: "2/5", probability: 10 },
        { name: "🔋 Энергетик", image: "images/items/energy.png", flavor: "Заряд бодрости", strength: "4/5", probability: 8 },
        { name: "🍑 Персик", image: "images/items/peach.png", flavor: "Нежная сладость", strength: "1/5", probability: 10 },
        { name: "🍏 Яблоко", image: "images/items/apple.png", flavor: "Классическая свежесть", strength: "2/5", probability: 10 },
        { name: "🍓 Клубника", image: "images/items/strawberry.png", flavor: "Ягодный взрыв", strength: "3/5", probability: 8 },
        { name: "🎈 Бабл-Гам", image: "images/items/bubblegum.png", flavor: "Детская радость", strength: "1/5", probability: 5 },
        { name: "🫐 Ежевика", image: "images/items/blackberry.png", flavor: "Терпкая глубина", strength: "3/5", probability: 8 },
        { name: "🍇 Виноград", image: "images/items/grape.png", flavor: "Виноградный коктейль", strength: "2/5", probability: 10 },
        { name: "🥶 Холодок", image: "images/items/ice.png", flavor: "Ледяная свежесть", strength: "5/5", probability: 3 },
        { name: "🍒 Вишня", image: "images/items/cherry.png", flavor: "Терпкая сладость", strength: "4/5", probability: 5 },
        { name: "🫐 Черника", image: "images/items/blueberry.png", flavor: "Лесная ягода", strength: "3/5", probability: 8 },
        { name: "5% Скидка", image: "images/items/discount.png", flavor: "На ваш следующий заказ", rarity: "discount-5", probability: 5 },
        { name: "10% Скидка", image: "images/items/discount.png", flavor: "На ваш следующий заказ", rarity: "discount-10", probability: 3 },
        { name: "15% Скидка", image: "images/items/discount.png", flavor: "На ваш следующий заказ", rarity: "discount-15", probability: 2 },
        { name: "20% Скидка", image: "images/items/discount.png", flavor: "На ваш следующий заказ", rarity: "discount-20", probability: 1 },
        { name: "Ничего", image: "images/items/nothing.png", flavor: "Попробуйте еще раз!", rarity: "nothing", probability: 15 },
        { name: "Бесплатная доставка", image: "images/items/shipping.png", flavor: "При заказе от 10 пачек", rarity: "free-shipping", probability: 2 },
        { name: "Дополнительный прокрут", image: "images/items/extra-spin.png", flavor: "Откройте еще один кейс бесплатно", rarity: "extra-spin", probability: 6 }
    ];

    const config = {
        scrollDuration: 200,
        itemWidth: 160,
        itemsCount: 120,
        acceleration: 0.14,
        deceleration: 0.01,
        freeCaseInterval: 86400
    };

    // Состояние
    const state = {
        balance: localStorage.getItem('balance') ? parseInt(localStorage.getItem('balance')) : 100,
        isOpening: false,
        inventory: JSON.parse(localStorage.getItem('inventory')) || [],
        stats: JSON.parse(localStorage.getItem('stats')) || { totalOpened: 0 },
        freeCaseTimeLeft: localStorage.getItem('freeCaseTimeLeft') ? parseInt(localStorage.getItem('freeCaseTimeLeft')) : config.freeCaseInterval,
        selectedCount: 1,
        lastCaseTime: localStorage.getItem('lastCaseTime') ? parseInt(localStorage.getItem('lastCaseTime')) : null,
        wonItems: [],
        animationFrameIds: [],
        velocity: 0,
        startTime: null,
        lastTime: null
    };

    // Инициализация
    init();

    function init() {
        checkFreeCase();
        setupEventListeners();
        startFreeCaseTimer();
        updateUI();
        applyTheme(localStorage.getItem('theme') || 'dark');
        document.querySelector('.open-option[data-count="1"]').classList.add('active');
    }

    function setupEventListeners() {
        elements.openBtn.addEventListener('click', startOpening);
        elements.continueBtn.addEventListener('click', continueAfterWin);
        elements.themeToggle.addEventListener('click', toggleTheme);
        elements.profileBtn.addEventListener('click', showInventory);
        elements.closeInventory.addEventListener('click', hideInventory);
        
        elements.openOptions.forEach(option => {
            option.addEventListener('click', () => {
                state.selectedCount = parseInt(option.dataset.count);
                elements.openOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                updateOpenButtonText();
            });
        });
    }

    function checkFreeCase() {
        if (!state.lastCaseTime) return;
        
        const now = Math.floor(Date.now() / 1000);
        const timePassed = now - state.lastCaseTime;
        
        if (timePassed >= config.freeCaseInterval) {
            const freeCases = Math.floor(timePassed / config.freeCaseInterval);
            state.balance += freeCases;
            state.lastCaseTime = now;
            saveState();
            updateUI();
        }
    }

    function startOpening() {
        if (state.isOpening || state.balance < state.selectedCount) return;
        
        state.isOpening = true;
        state.balance -= state.selectedCount;
        state.wonItems = [];
        
        updateUI();
        animateOpening();
    }

    function animateOpening() {
        elements.caseImage.style.transform = 'rotateY(180deg) scale(1.2)';
        setTimeout(() => {
            elements.caseImage.style.transform = 'rotateY(0deg) scale(1)';
            startScrolling();
        }, 1000);
    }

    function startScrolling() {
        elements.unlockPhase.style.opacity = '0';
        elements.scrollPhase.style.display = 'flex';
        elements.multiTrackContainer.innerHTML = '';
        
        for (let i = 0; i < state.selectedCount; i++) {
            const trackContainer = document.createElement('div');
            trackContainer.className = 'track-container';
            
            const centerLine = document.createElement('div');
            centerLine.className = 'track-center-line';
            trackContainer.appendChild(centerLine);
            
            const itemsTrack = document.createElement('div');
            itemsTrack.className = 'items-track';
            trackContainer.appendChild(itemsTrack);
            
            elements.multiTrackContainer.appendChild(trackContainer);
            fillItemsTrack(itemsTrack);
        }
        
        playSound('scroll');
        animateAllTracks();
    }

    function animateAllTracks() {
        const trackContainers = document.querySelectorAll('.track-container');
        state.animationFrameIds = [];
        
        trackContainers.forEach((container, index) => {
            const track = container.querySelector('.items-track');
            const centerLine = container.querySelector('.track-center-line');
            const centerLineRect = centerLine.getBoundingClientRect();
            const centerX = centerLineRect.left + centerLineRect.width / 2;
            
            const firstItem = track.querySelector('.scroll-item');
            const itemWidth = firstItem.offsetWidth + 20;
            
            const stopIndex = Math.floor(Math.random() * (config.itemsCount - 50)) + 30;
            const targetPosition = stopIndex * itemWidth - (window.innerWidth / 2 - itemWidth / 2);
            
            let startTime = null;
            let lastTime = null;
            let currentPosition = 0;
            let velocity = 0.5;
            
            function animateTrack(timestamp) {
                if (!startTime) startTime = timestamp;
                if (!lastTime) lastTime = timestamp;
                
                const elapsed = timestamp - startTime;
                const deltaTime = timestamp - lastTime;
                lastTime = timestamp;
                
                // Ускорение в начале
                if (elapsed < config.scrollDuration * 0.7) {
                    velocity += config.acceleration * deltaTime;
                } 
                // Замедление в конце
                else {
                    velocity = Math.max(0.05, velocity - config.deceleration * deltaTime);
                }
                
                currentPosition += velocity * deltaTime;
                
                // Плавная остановка
                if (currentPosition > targetPosition * 0.9) {
                    velocity = Math.max(0.01, velocity * 0.95);
                }
                
                // Финализация позиции
                if (currentPosition >= targetPosition) {
                    currentPosition = targetPosition;
                    track.style.transform = `translateX(-${currentPosition}px)`;
                    updateSelectedItem(track, container, index);
                    
                    if (index === trackContainers.length - 1) {
                        setTimeout(finishOpening, 500);
                    }
                    return;
                }
                
                track.style.transform = `translateX(-${currentPosition}px)`;
                
                // Обновление выбранного предмета
                if (elapsed > config.scrollDuration * 0.8) {
                    updateSelectedItem(track, container, index);
                }
                
                state.animationFrameIds[index] = requestAnimationFrame(animateTrack);
            }
            
            state.animationFrameIds[index] = requestAnimationFrame(animateTrack);
        });
    }

    function updateSelectedItem(track, container, trackIndex) {
        const centerLine = container.querySelector('.track-center-line');
        const centerLineRect = centerLine.getBoundingClientRect();
        const centerX = centerLineRect.left + centerLineRect.width / 2;
        
        let closestItem = null;
        let minDistance = Infinity;
        
        track.querySelectorAll('.scroll-item').forEach(item => {
            item.classList.remove('selected');
            const rect = item.getBoundingClientRect();
            const itemCenter = rect.left + rect.width / 2;
            const distance = Math.abs(itemCenter - centerX);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestItem = item;
            }
        });
        
        if (closestItem) {
            closestItem.classList.add('selected');
            const selectedItem = JSON.parse(closestItem.dataset.item);
            state.wonItems[trackIndex] = selectedItem;
        }
    }

    function finishOpening() {
        document.querySelectorAll('.track-container').forEach((container, index) => {
            const track = container.querySelector('.items-track');
            updateSelectedItem(track, container, index);
        });
        
        state.animationFrameIds.forEach(id => cancelAnimationFrame(id));
        state.animationFrameIds = [];
        
        elements.scrollPhase.style.display = 'none';
        showResults();
        
        state.stats.totalOpened += state.selectedCount;
        state.lastCaseTime = Math.floor(Date.now() / 1000);
        
        state.wonItems.forEach(item => {
            if (item.rarity === 'extra-spin') {
                state.balance += 1;
            } else if (item.rarity !== 'nothing') {
                state.inventory.push(item);
            }
        });
        
        saveState();
        updateUI();
    }

    function showResults() {
        elements.resultPhase.style.display = 'flex';
        elements.multiResultContainer.innerHTML = '';
        
        state.wonItems.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';
            
            const itemGlow = document.createElement('div');
            itemGlow.className = 'item-glow';
            itemCard.appendChild(itemGlow);
            
            const itemImg = document.createElement('img');
            itemImg.src = item.image;
            itemImg.alt = item.name;
            itemCard.appendChild(itemImg);
            
            const itemDetails = document.createElement('div');
            itemDetails.className = 'item-details';
            
            const itemName = document.createElement('h2');
            itemName.textContent = item.name;
            itemDetails.appendChild(itemName);
            
            const rarityBadge = document.createElement('div');
            rarityBadge.className = `rarity-badge ${item.rarity || 'common'}`;
            rarityBadge.textContent = getRarityText(item);
            itemDetails.appendChild(rarityBadge);
            
            const itemFlavor = document.createElement('p');
            itemFlavor.textContent = item.flavor;
            itemDetails.appendChild(itemFlavor);
            
            itemCard.appendChild(itemDetails);
            elements.multiResultContainer.appendChild(itemCard);
            
            if (item.strength === '5/5' || item.rarity === 'extra-spin') {
                createConfetti();
            }
        });
        
        playSound(state.wonItems.some(item => item.rarity === 'nothing') ? 'lose' : 'win');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }

    function continueAfterWin() {
        elements.resultPhase.style.display = 'none';
        elements.unlockPhase.style.opacity = '1';
        state.isOpening = false;
        updateUI();
    }

    function fillItemsTrack(track) {
        const weightedItems = [];
        items.forEach(item => {
            for (let i = 0; i < item.probability; i++) {
                weightedItems.push(item);
            }
        });
        
        for (let i = 0; i < config.itemsCount; i++) {
            const randomIndex = Math.floor(Math.random() * weightedItems.length);
            const randomItem = weightedItems[randomIndex];
            
            const itemElement = document.createElement('div');
            itemElement.className = 'scroll-item';
            itemElement.innerHTML = `
                <img src="${randomItem.image}" alt="${randomItem.name}">
                <h3>${randomItem.name}</h3>
            `;
            itemElement.dataset.item = JSON.stringify(randomItem);
            track.appendChild(itemElement);
        }
    }

    function startFreeCaseTimer() {
        setInterval(() => {
            state.freeCaseTimeLeft--;
            updateFreeCaseTimer();
            localStorage.setItem('freeCaseTimeLeft', state.freeCaseTimeLeft);
            
            if (state.freeCaseTimeLeft <= 0) {
                state.balance++;
                state.freeCaseTimeLeft = config.freeCaseInterval;
                saveState();
                updateUI();
            }
        }, 1000);
    }

    function updateFreeCaseTimer() {
        const h = Math.floor(state.freeCaseTimeLeft / 3600);
        const m = Math.floor((state.freeCaseTimeLeft % 3600) / 60);
        const s = state.freeCaseTimeLeft % 60;
        elements.freeCaseTimer.textContent = `${h}h ${m}m ${s}s`;
    }

    function updateUI() {
        elements.balanceEl.textContent = state.balance;
        elements.profileBalance.textContent = state.balance;
        elements.totalOpened.textContent = state.stats.totalOpened;
        updateOpenButtonText();
        elements.openBtn.disabled = state.balance < state.selectedCount;
    }

    function updateOpenButtonText() {
        elements.openBtn.textContent = state.selectedCount > 1 ? 
            `ОТКРЫТЬ ${state.selectedCount} КЕЙСА` : 
            'ОТКРЫТЬ 1 КЕЙС';
    }

    function toggleTheme() {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        elements.themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    }

    function showInventory() {
        elements.inventoryItems.innerHTML = '';
        state.inventory.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'inventory-item';
            itemEl.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <h3>${item.name}</h3>
                <p>${item.flavor}</p>
                ${item.strength ? `<p class="strength">${item.strength}</p>` : ''}
            `;
            elements.inventoryItems.appendChild(itemEl);
        });
        elements.inventoryModal.style.display = 'flex';
    }

    function hideInventory() {
        elements.inventoryModal.style.display = 'none';
    }

    function playSound(type) {
        const sound = new Audio(`sounds/${type}.mp3`);
        sound.volume = 0.5;
        sound.play().catch(e => console.log("Audio play failed:", e));
    }

    function createConfetti() {
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.width = `${Math.random() * 10 + 5}px`;
            confetti.style.height = `${Math.random() * 10 + 5}px`;
            confetti.style.animationDuration = `${Math.random() * 2 + 2}s`;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 3000);
        }
    }

    function getRarityText(item) {
        const rarityMap = {
            'common': 'ОБЫЧНЫЙ',
            'rare': 'РЕДКИЙ',
            'mythical': 'МИФИЧЕСКИЙ',
            'legendary': 'ЛЕГЕНДАРНЫЙ',
            'nothing': 'ПУСТО',
            'discount-5': 'СКИДКА 5%',
            'discount-10': 'СКИДКА 10%',
            'discount-15': 'СКИДКА 15%',
            'discount-20': 'СКИДКА 20%',
            'free-shipping': 'БЕСПЛАТНАЯ ДОСТАВКА',
            'extra-spin': 'ДОП. ПРОКРУТ'
        };
        return rarityMap[item.rarity] || 'ОБЫЧНЫЙ';
    }

    function saveState() {
        localStorage.setItem('inventory', JSON.stringify(state.inventory));
        localStorage.setItem('stats', JSON.stringify(state.stats));
        localStorage.setItem('balance', state.balance);
        localStorage.setItem('lastCaseTime', state.lastCaseTime);
    }
});