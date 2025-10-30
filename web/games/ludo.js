// Minimal Ludo client: renders simple board, dice UI, and tokens
class LudoClient {
    constructor(socket, user, room) {
        this.socket = socket;
        this.user = user;
        this.room = room;
        this.state = null;
        this.container = null;
        this.boardEl = null;
        this.diceEl = null;
        this.rollBtn = null;
        this.currentDie = 0;
        this.movable = [];
        this.colorByUserId = {};
        if (room && room.players) {
            room.players.forEach((p, idx) => {
                this.colorByUserId[p.userId] = idx === 0 ? 'red' : 'blue';
            });
        }
        this.registerEvents();
        this.coords = this.buildCoords();
    }

    mount(parent) {
        this.container = document.createElement('div');
        this.container.className = 'ludo-container';
        // Board
        this.boardEl = document.createElement('div');
        this.boardEl.className = 'ludo-board';
        this.drawBoardTiles();
        // Dice
        const diceWrap = document.createElement('div');
        diceWrap.className = 'ludo-dice';
        this.diceEl = document.createElement('div');
        this.diceEl.className = 'die';
        this.diceEl.textContent = '-';
        this.rollBtn = document.createElement('button');
        this.rollBtn.className = 'btn btn-primary';
        this.rollBtn.textContent = 'Roll';
        this.rollBtn.addEventListener('click', () => this.roll());
        diceWrap.appendChild(this.diceEl);
        diceWrap.appendChild(this.rollBtn);

        // Turn banner
        this.turnBannerEl = document.createElement('div');
        this.turnBannerEl.className = 'ludo-turn-banner';
        this.turnBannerEl.textContent = '';

        this.container.appendChild(this.boardEl);
        this.container.appendChild(diceWrap);
        this.container.appendChild(this.turnBannerEl);
        parent.innerHTML = '';
        parent.appendChild(this.container);
    }

    roll() {
        if (!this.state || this.state.currentTurnUserId !== this.user.userId) return;
        this.socket.emit('ludo:rollDice', { roomId: this.room.roomId });
    }

    render() {
        if (!this.state || !this.boardEl) return;
        // Clear tokens
        this.boardEl.querySelectorAll('.token').forEach(t => t.remove());
        const place = (idx) => this.coords.track[idx] || { left: '50%', top: '50%' };
        const addToken = (color, label, style) => {
            const el = document.createElement('div');
            el.className = `token ${color}`;
            el.textContent = label;
            el.style.left = style.left;
            el.style.top = style.top;
            this.boardEl.appendChild(el);
            return el;
        };

        this.state.players.forEach(pl => {
            pl.tokens.forEach((t, i) => {
                let pos;
                if (t.posType === 'track') pos = place(t.index);
                else if (t.posType === 'home') pos = (pl.color === 'red') ? this.coords.home.red[i] : this.coords.home.blue[i];
                else if (t.posType === 'lane') pos = (pl.color === 'red') ? this.coords.lane.red[t.index] : this.coords.lane.blue[t.index];
                else pos = (pl.color === 'red') ? this.coords.goal.red : this.coords.goal.blue;
                const el = addToken(pl.color, i + 1, pos);
                // crude stacking offset
                const sameTileCount = Array.from(this.boardEl.querySelectorAll('.token')).filter(x => x.style.left===el.style.left && x.style.top===el.style.top).length;
                if (sameTileCount === 2) el.classList.add('stack1');
                if (sameTileCount >= 3) el.classList.add('stack2');
                el.dataset.tokenId = t.id;
                if (this.movable.find(m => m.tokenId === t.id)) {
                    el.classList.add('highlight');
                    el.style.cursor = 'pointer';
                    el.addEventListener('click', () => this.moveToken(t.id));
                }
            });
        });

        // Dice UI state
        this.diceEl.textContent = this.currentDie || '-';
        const myTurn = this.state.currentTurnUserId === this.user.userId;
        this.rollBtn.disabled = !myTurn;
        this.turnBannerEl.textContent = myTurn ? 'Your turn' : `${this.getUsername(this.state.currentTurnUserId)}'s turn`;
    }

    drawBoardTiles() {
        // draw track tiles and mark safe/start
        if (!this.boardEl) return;
        this.boardEl.querySelectorAll('.tile').forEach(t => t.remove());
        this.boardEl.querySelectorAll('.goal-home').forEach(t => t.remove());
        const track = this.coords.track;
        track.forEach((p, idx) => {
            const t = document.createElement('div');
            t.className = 'tile';
            t.style.left = p.left; t.style.top = p.top;
            if ([0,8,13,21,26,34,39,47].includes(idx)) t.classList.add('safe');
            if (idx === 0) t.classList.add('start-red');
            if (idx === 26) t.classList.add('start-blue');
            this.boardEl.appendChild(t);
        });

        // lanes
        this.coords.lane.red.forEach((p) => {
            const t = document.createElement('div');
            t.className = 'tile lane-red';
            t.style.left = p.left; t.style.top = p.top;
            this.boardEl.appendChild(t);
        });
        this.coords.lane.blue.forEach((p) => {
            const t = document.createElement('div');
            t.className = 'tile lane-blue';
            t.style.left = p.left; t.style.top = p.top;
            this.boardEl.appendChild(t);
        });

        // goal/home squares
        const redHome = document.createElement('div');
        redHome.className = 'goal-home red';
        redHome.style.left = '20%'; redHome.style.top = '20%';
        this.boardEl.appendChild(redHome);

        const blueHome = document.createElement('div');
        blueHome.className = 'goal-home blue';
        blueHome.style.left = '80%'; blueHome.style.top = '80%';
        this.boardEl.appendChild(blueHome);
    }

    buildCoords() {
        // Build approximate coordinates for 52 track cells in a rounded rectangle path
        const track = [];
        const ring = (n, rX, rY, cx, cy) => {
            for (let i=0;i<n;i++){
                const a = (i/n)*Math.PI*2;
                track.push({ left: `${cx + rX*Math.cos(a)}%`, top: `${cy + rY*Math.sin(a)}%`});
            }
        };
        // 52 points around ellipse (approx)
        for (let i=0;i<52;i++){
            const a = (i/52)*Math.PI*2;
            const cx=50, cy=50, rx=40, ry=40;
            track.push({ left: `${cx + rx*Math.cos(a)}%`, top: `${cy + ry*Math.sin(a)}%`});
        }
        const lane = {
            red: Array.from({length:6}).map((_,i)=>({ left: `${50 - (i+1)*4}%`, top: '50%' })),
            blue: Array.from({length:6}).map((_,i)=>({ left: `${50 + (i+1)*4}%`, top: '50%' }))
        };
        const home = {
            red: [ {left:'20%',top:'20%'},{left:'25%',top:'20%'},{left:'20%',top:'25%'},{left:'25%',top:'25%'} ],
            blue:[ {left:'80%',top:'80%'},{left:'75%',top:'80%'},{left:'80%',top:'75%'},{left:'75%',top:'75%'} ]
        };
        const goal = { red: { left:'45%', top:'50%'}, blue:{ left:'55%', top:'50%'} };
        return { track, lane, home, goal };
    }

    moveToken(tokenId) {
        if (!this.currentDie) return;
        this.socket.emit('ludo:moveToken', { roomId: this.room.roomId, tokenId, die: this.currentDie });
    }

    registerEvents() {
        this.socket.on('ludo:started', (data) => {
            if (!this.room || data?.state?.players?.length) {
                this.state = data.state;
                this.room.currentTurn = data.currentTurn;
                this.mount(document.getElementById('gameBoardContainer'));
                this.render();
            }
        });

        this.socket.on('ludo:diceRolled', (data) => {
            this.currentDie = data.value;
            this.movable = data.movableTokens || [];
            if (this.movable.length === 0 && this.state && this.state.currentTurnUserId === this.user.userId) {
                // show a brief hint near dice
                this.turnBannerEl.textContent = 'No moves available';
                setTimeout(() => this.render(), 1200);
            }
            this.render();
        });

        this.socket.on('ludo:tokenMoved', (data) => {
            this.state = data.state;
            this.currentDie = 0;
            this.movable = [];
            this.render();
        });

        this.socket.on('ludo:turnChanged', (data) => {
            if (this.state) this.state.currentTurnUserId = data.nextUserId;
            this.currentDie = 0;
            this.movable = [];
            this.render();
        });
    }

    getUsername(userId) {
        const pl = (this.state?.players || []).find(p => p.userId === userId);
        return pl?.username || 'Opponent';
    }
}

window.LudoClient = LudoClient;


