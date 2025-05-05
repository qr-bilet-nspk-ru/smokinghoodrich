document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.expand();
    tg.enableClosingConfirmation();

    const elements = {
        unlockPhase: document.getElementById('unlock-phase'),
        scrollPhase: document.getElementById('scroll-phase'),
        resultPhase: document.getElementById('result-phase'),
        progressBar: document.getElementById('progress-bar'),
        itemsTrack: document.getElementById('items-track'),
        wonItemImage: document.getElementById('won-item-image'),
        wonItemName: document.getElementById('won-item-name'),
        wonItemFlavor: document.getElementById('won-item-flavor'),
        rarityBadge: document.getElementById('rarity-badge'),
        openBtn: document.getElementById('open-btn'),
        continueBtn: document.getElementById('continue-btn'),
        fastOpenBtn: document.getElementById('fast-open-btn'),
        balanceEl: document.getElementById('balance'),
        inventoryCounter: document.getElementById('inventory-counter'),
        freeCaseTimer: document.getElementById('free-case-timer'),
        caseImage: document.querySelector('.case-image')
    };

    // Полный список предметов с вероятностями
    const items = [
        // LOOP пачки (редкие)
        { name: "🍉 Арбуз", image: "images/items/watermelon.png", flavor: "Сочный летний вкус", rarity: "rare", strength: "2/5", probability: 2 },
        { name: "🔋 Энергетик", image: "images/items/energy.png", flavor: "Заряд бодрости", rarity: "rare", strength: "4/5", probability: 2 },
        { name: "🍑 Персик", image: "images/items/peach.png", flavor: "Нежная сладость", rarity: "rare", strength: "1/5", probability: 2 },
        { name: "🍏 Яблоко", image: "images/items/apple.png", flavor: "Классическая свежесть", rarity: "rare", strength: "2/5", probability: 2 },
        { name: "🍓 Клубника", image: "images/items/strawberry.png", flavor: "Ягодный взрыв", rarity: "rare", strength: "3/5", probability: 2 },
        { name: "🎈 Бабл-Гам", image: "images/items/bubblegum.png", flavor: "Детская радость", rarity: "mythical", strength: "1/5", probability: 2 },
        { name: "🫐 Ежевика", image: "images/items/blackberry.png", flavor: "Терпкая глубина", rarity: "rare", strength: "3/5", probability: 2 },
        { name: "🍇 Виноград", image: "images/items/grape.png", flavor: "Виноградный коктейль", rarity: "rare", strength: "2/5", probability: 2 },
        { name: "🥶 Холодок", image: "images/items/ice.png", flavor: "Ледяная свежесть", rarity: "legendary", strength: "5/5", probability: 2 },
        { name: "🍒 Вишня", image: "images/items/cherry.png", flavor: "Терпкая сладость", rarity: "mythical", strength: "4/5", probability: 2 },
        { name: "🫐 Черника", image: "images/items/blueberry.png", flavor: "Лесная ягода", rarity: "rare", strength: "3/5", probability: 2 },
        
        // Скидки
        { name: "5% Скидка", image: "images/items/discount.png", flavor: "На ваш следующий заказ", rarity: "discount-5", probability: 10 },
        { name: "10% Скидка", image: "images/items/discount.png", flavor: "На ваш следующий заказ", rarity: "discount-10", probability: 7 },
        { name: "15% Скидка", image: "images/items/discount.png", flavor: "На ваш следующий заказ", rarity: "discount-15", probability: 6 },
        { name: "20% Скидка", image: "images/items/discount.png", flavor: "На ваш следующий заказ", rarity: "discount-20", probability: 3 },
        
        // Другие награды
        { name: "Ничего", image: "images/items/nothing.png", flavor: "Попробуйте еще раз!", rarity: "nothing", probability: 40 },
        { name: "Бесплатная доставка", image: "images/items/shipping.png", flavor: "При заказе от 10 пачек", rarity: "free-shipping", probability: 2 },
        { name: "Дополнительный прокрут", image: "images/items/extra-spin.png", flavor: "Откройте еще один кейс бесплатно", rarity: "extra-spin", probability: 10 }
    ];

    const config = {
        scrollDuration: 4000,
        itemWidth: 160
    };

    const state = {
        balance: 5,
        isOpening: false,
        scrollPosition: 0,
        targetPosition: 0,
        animationFrameId: null,
        selectedItem: null,
        inventory: [],
        freeCaseTimeLeft: 3600,
        audio: {
            unlock: document.getElementById('unlock-sound'),
            scroll: document.getElementById('scroll-sound'),
            slowdown: document.getElementById('slowdown-sound'),
            win: document.getElementById('win-sound'),
            lose: document.getElementById('lose-sound')
        }
    };

    init();

    function init() {
        setupEventListeners();
        startFreeCaseTimer();
        updateInventoryCounter();
        elements.caseImage.style.animation = "float 4s ease-in-out infinite";
    }

    function setupEventListeners() {
        elements.openBtn.addEventListener('click', () => startOpening(false));
        elements.fastOpenBtn.addEventListener('click', () => {
            if (state.balance >= 3) startOpening(true);
        });
        elements.continueBtn.addEventListener('click', continueAfterWin);
    }

    function startOpening(isFast) {
        if (state.isOpening || state.balance < (isFast ? 3 : 1)) return;
        state.isOpening = true;
        state.balance -= isFast ? 3 : 1;
        elements.balanceEl.textContent = state.balance;

        elements.progressBar.style.width = '0%';
        elements.unlockPhase.style.opacity = '1';
        elements.scrollPhase.style.display = 'none';
        elements.resultPhase.style.display = 'none';

        state.audio.unlock.currentTime = 0;
        state.audio.unlock.play();

        if (isFast) {
            elements.progressBar.style.width = '100%';
            setTimeout(startScrolling, 100);
        } else {
            animateProgressBar();
        }
    }

    function animateProgressBar() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += 2;
            elements.progressBar.style.width = `${progress}%`;
            if (progress >= 100) {
                clearInterval(interval);
                startScrolling();
            }
        }, 20);
    }

    function fillItemsTrack() {
        elements.itemsTrack.innerHTML = '';
        
        // Создаем взвешенный массив предметов
        const weightedItems = [];
        items.forEach(item => {
            for (let i = 0; i < item.probability; i++) {
                weightedItems.push(item);
            }
        });
        
        // Заполняем трек случайными предметами с учетом вероятностей
        for (let i = 0; i < 60; i++) { // Увеличил количество предметов
            const randomIndex = Math.floor(Math.random() * weightedItems.length);
            const randomItem = weightedItems[randomIndex];
            
            const itemElement = document.createElement('div');
            itemElement.className = 'scroll-item';
            itemElement.innerHTML = `
                <img src="${randomItem.image}" alt="${randomItem.name}">
                <h3>${randomItem.name}</h3>
            `;
            itemElement.dataset.item = JSON.stringify(randomItem);
            elements.itemsTrack.appendChild(itemElement);
        }
    }

    function startScrolling() {
        elements.unlockPhase.style.opacity = '0';
        elements.scrollPhase.style.display = 'flex';
        fillItemsTrack();

        const firstItem = document.querySelector('.scroll-item');
        config.itemWidth = firstItem.offsetWidth + 10;

        // Выбираем случайную позицию остановки (в первой половине трека)
        const stopIndex = 20 + Math.floor(Math.random() * 20);
        state.targetPosition = stopIndex * config.itemWidth - (window.innerWidth / 2 - config.itemWidth / 2);
        state.scrollPosition = 0;

        state.audio.scroll.currentTime = 0;
        state.audio.scroll.loop = true;
        state.audio.scroll.play();

        state.startTime = performance.now();
        state.animationFrameId = requestAnimationFrame(animateScroll);
    }

    function animateScroll(timestamp) {
        const elapsed = timestamp - state.startTime;
        const progress = Math.min(elapsed / config.scrollDuration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentPosition = easedProgress * state.targetPosition;

        elements.itemsTrack.style.transform = `translateX(-${currentPosition}px)`;
        state.scrollPosition = currentPosition;

        updateSelectedItem();

        if (progress < 1) {
            state.animationFrameId = requestAnimationFrame(animateScroll);
        } else {
            finishOpening();
        }
    }

    function updateSelectedItem() {
        const centerX = window.innerWidth / 2;
        let closestItem = null;
        let minDistance = Infinity;

        document.querySelectorAll('.scroll-item').forEach(item => {
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
            state.selectedItem = JSON.parse(closestItem.dataset.item);
        }
    }

    function finishOpening() {
        elements.scrollPhase.style.display = 'none';
        elements.resultPhase.style.display = 'flex';

        elements.wonItemImage.src = state.selectedItem.image;
        elements.wonItemName.textContent = state.selectedItem.name;
        elements.wonItemFlavor.textContent = state.selectedItem.flavor;

        const rarityText = {
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
        }[state.selectedItem.rarity];

        elements.rarityBadge.textContent = rarityText;
        elements.rarityBadge.className = `rarity-badge ${state.selectedItem.rarity}`;

        // Обработка специальных наград
        if (state.selectedItem.rarity === 'nothing') {
            state.audio.lose.currentTime = 0;
            state.audio.lose.play();
        } else if (state.selectedItem.rarity === 'extra-spin') {
            state.balance += 1;
            elements.balanceEl.textContent = state.balance;
            state.audio.win.currentTime = 0;
            state.audio.win.play();
        } else {
            state.inventory.push(state.selectedItem);
            updateInventoryCounter();
            state.audio.win.currentTime = 0;
            state.audio.win.play();
        }

        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }

    function continueAfterWin() {
        elements.resultPhase.style.display = 'none';
        elements.unlockPhase.style.opacity = '1';
        state.isOpening = false;

        if (state.balance === 0) {
            state.balance = 3;
            elements.balanceEl.textContent = state.balance;
        }
    }

    function startFreeCaseTimer() {
        setInterval(() => {
            state.freeCaseTimeLeft--;
            const m = Math.floor(state.freeCaseTimeLeft / 60);
            const s = state.freeCaseTimeLeft % 60;
            elements.freeCaseTimer.textContent = `${m}m ${s}s`;

            if (state.freeCaseTimeLeft <= 0) {
                state.balance++;
                elements.balanceEl.textContent = state.balance;
                state.freeCaseTimeLeft = 3600;
            }
        }, 1000);
    }

    function updateInventoryCounter() {
        elements.inventoryCounter.textContent = `Предметов: ${state.inventory.length}`;
    }

    // Telegram main button
    if (tg.platform !== 'unknown') {
        tg.MainButton.setText("Купить пластинки");
        tg.MainButton.onClick(() => {
            tg.showPopup({
                title: "Пополнение баланса",
                message: "Выберите количество:",
                buttons: [
                    { id: '5', type: 'default', text: '5 пластинок за $5' },
                    { id: '10', type: 'default', text: '10 пластинок за $8' }
                ]
            }, (btnId) => {
                if (btnId) {
                    state.balance += parseInt(btnId);
                    elements.balanceEl.textContent = state.balance;
                }
            });
        });
        tg.MainButton.show();
    }
});