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

    const items = [
        { name: "🍉 Арбуз", image: "images/items/watermelon.png", flavor: "Сочный летний вкус", rarity: "common", strength: "2/5" },
        { name: "🔋 Энергетик", image: "images/items/energy.png", flavor: "Заряд бодрости", rarity: "rare", strength: "4/5" },
        { name: "🍑 Персик", image: "images/items/peach.png", flavor: "Нежная сладость", rarity: "common", strength: "1/5" },
        { name: "🍏 Яблоко", image: "images/items/apple.png", flavor: "Классическая свежесть", rarity: "common", strength: "2/5" },
        { name: "🍓 Клубника", image: "images/items/strawberry.png", flavor: "Ягодный взрыв", rarity: "rare", strength: "3/5" },
        { name: "🎈 Бабл-Гам", image: "images/items/bubblegum.png", flavor: "Детская радость", rarity: "mythical", strength: "1/5" },
        { name: "🫐 Ежевика", image: "images/items/blackberry.png", flavor: "Терпкая глубина", rarity: "rare", strength: "3/5" },
        { name: "🍇 Виноград", image: "images/items/grape.png", flavor: "Виноградный коктейль", rarity: "common", strength: "2/5" },
        { name: "🥶 Холодок", image: "images/items/ice.png", flavor: "Ледяная свежесть", rarity: "legendary", strength: "5/5" },
        { name: "🍒 Вишня", image: "images/items/cherry.png", flavor: "Терпкая сладость", rarity: "mythical", strength: "4/5" },
        { name: "🫐 Черника", image: "images/items/blueberry.png", flavor: "Лесная ягода", rarity: "rare", strength: "3/5" }
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
            win: document.getElementById('win-sound')
        }
    };

    init();

    function init() {
        fillItemsTrack();
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

    function startScrolling() {
        elements.unlockPhase.style.opacity = '0';
        elements.scrollPhase.style.display = 'flex';
        fillItemsTrack();

        const firstItem = document.querySelector('.scroll-item');
        config.itemWidth = firstItem.offsetWidth + 10;

        const stopIndex = 30 + Math.floor(Math.random() * 10);
        state.targetPosition = stopIndex * config.itemWidth - (window.innerWidth / 2 - config.itemWidth / 2);
        state.scrollPosition = 0;

        state.audio.scroll.currentTime = 0;
        state.audio.scroll.loop = true;
        state.audio.scroll.play();

        state.startTime = performance.now();
        requestAnimationFrame(animateScroll);
    }

    function animateScroll(timestamp) {
        const elapsed = timestamp - state.startTime;
        const progress = Math.min(elapsed / config.scrollDuration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const currentPosition = easedProgress * state.targetPosition;

        elements.itemsTrack.style.transform = `translateX(-${currentPosition}px)`;
        state.scrollPosition = currentPosition;

        updateSelectedItem();

        if (progress < 1) {
            requestAnimationFrame(animateScroll);
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
            'legendary': 'ЛЕГЕНДАРНЫЙ'
        }[state.selectedItem.rarity];

        elements.rarityBadge.textContent = rarityText;
        elements.rarityBadge.className = `rarity-badge ${state.selectedItem.rarity}`;

        state.inventory.push(state.selectedItem);
        updateInventoryCounter();

        state.audio.scroll.pause();
        state.audio.win.currentTime = 0;
        state.audio.win.play();

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

    function fillItemsTrack() {
        elements.itemsTrack.innerHTML = '';
        for (let i = 0; i < 40; i++) {
            [...items].sort(() => Math.random() - 0.5).forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'scroll-item';
                itemElement.innerHTML = `
                    <img src="${item.image}" alt="${item.name}">
                    <h3>${item.name}</h3>
                `;
                itemElement.dataset.item = JSON.stringify(item);
                elements.itemsTrack.appendChild(itemElement);
            });
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
