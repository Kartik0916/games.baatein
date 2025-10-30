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
        // SVG backdrop that mimics provided board
        this.backdrop = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.backdrop.setAttribute('viewBox', '0 0 150 150');
        this.backdrop.classList.add('ludo-backdrop');
        this.boardEl.appendChild(this.backdrop);
        this.drawBoardBackground();
        this.drawBoardTiles();
        // Dice
        const yourDice = document.createElement('div');
        yourDice.className = 'dice-slot you';
        const yourLabel = document.createElement('div');
        yourLabel.className = 'dice-label';
        yourLabel.textContent = 'You';
        this.diceEl = document.createElement('div');
        this.diceEl.className = 'die';
        this.diceEl.textContent = '-';
        this.rollBtn = document.createElement('button');
        this.rollBtn.className = 'btn btn-primary';
        this.rollBtn.textContent = 'Roll';
        this.rollBtn.addEventListener('click', () => this.roll());
        yourDice.appendChild(yourLabel);
        yourDice.appendChild(this.diceEl);
        yourDice.appendChild(this.rollBtn);

        const oppDice = document.createElement('div');
        oppDice.className = 'dice-slot opponent';
        const oppLabel = document.createElement('div');
        oppLabel.className = 'dice-label';
        oppLabel.textContent = 'Opponent';
        const oppDie = document.createElement('div');
        oppDie.className = 'die';
        oppDie.textContent = '-';
        oppDice.appendChild(oppLabel);
        oppDice.appendChild(oppDie);

        // Turn banner
        this.turnBannerEl = document.createElement('div');
        this.turnBannerEl.className = 'ludo-turn-banner';
        this.turnBannerEl.textContent = '';

        // avatar slots
        this.youAvatar = document.createElement('div');
        this.youAvatar.className = 'avatar-slot you';
        this.youAvatar.textContent = this.user?.avatar || '🙂';
        this.oppAvatar = document.createElement('div');
        this.oppAvatar.className = 'avatar-slot opponent';
        this.oppAvatar.textContent = '👤';

        this.container.appendChild(this.boardEl);
        this.boardEl.appendChild(yourDice);
        this.boardEl.appendChild(oppDice);
        this.boardEl.appendChild(this.youAvatar);
        this.boardEl.appendChild(this.oppAvatar);
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
        // Exact 15x15 grid mapping. Each cell is ~ (100/15)% size; we take centers.
        const cell = (x, y) => ({ left: `${(x+0.5)/15*100}%`, top: `${(y+0.5)/15*100}%` });
        // Standard Ludo track (starting at red start going clockwise)
        const path = [
            // top row left to right (y=6 from x=0..5), then down, etc.
            [6,1],[6,2],[6,3],[6,4],[6,5],
            [5,6],[4,6],[3,6],[2,6],[1,6],
            [0,6],[0,7],[0,8],
            [1,8],[2,8],[3,8],[4,8],[5,8],
            [6,9],[6,10],[6,11],[6,12],[6,13],
            [6,14],[7,14],[8,14],
            [8,13],[8,12],[8,11],[8,10],[8,9],
            [9,8],[10,8],[11,8],[12,8],[13,8],
            [14,8],[14,7],[14,6],
            [13,6],[12,6],[11,6],[10,6],[9,6],
            [8,5],[8,4],[8,3],[8,2],[8,1],
            [8,0],[7,0],[6,0]
        ];
        const track = path.map(([x,y]) => cell(x,y));
        const lane = {
            red: [cell(7,1),cell(7,2),cell(7,3),cell(7,4),cell(7,5),cell(7,6)],
            blue: [cell(7,13),cell(7,12),cell(7,11),cell(7,10),cell(7,9),cell(7,8)]
        };
        const home = {
            red: [ cell(1.5,1.5), cell(3.5,1.5), cell(1.5,3.5), cell(3.5,3.5) ],
            blue:[ cell(11.5,11.5), cell(13.5,11.5), cell(11.5,13.5), cell(13.5,13.5) ]
        };
        const goal = { red: cell(7,7), blue: cell(7,7) };
        return { track, lane, home, goal };
    }

    drawBoardBackground() {
        const s = this.backdrop;
        while (s.firstChild) s.removeChild(s.firstChild);
        const add = (el)=>s.appendChild(el);
        const rect=(x,y,w,h,fill,stroke)=>{const r=document.createElementNS('http://www.w3.org/2000/svg','rect');r.setAttribute('x',x);r.setAttribute('y',y);r.setAttribute('width',w);r.setAttribute('height',h); if (fill) r.setAttribute('fill',fill); if (stroke){r.setAttribute('stroke',stroke); r.setAttribute('stroke-width','1');} return r;};
        const poly=(points,fill)=>{const p=document.createElementNS('http://www.w3.org/2000/svg','polygon');p.setAttribute('points',points); if (fill) p.setAttribute('fill',fill); return p;};
        const cellSize = 10; // 150/15
        const cellC = (x,y)=>({ cx: x*cellSize + cellSize/2, cy: y*cellSize + cellSize/2 });
        const star=(x,y,color='#f5c518')=>{ const {cx,cy}=cellC(x,y); const r=3; const p=document.createElementNS('http://www.w3.org/2000/svg','path'); p.setAttribute('fill', color); p.setAttribute('d', `M ${cx} ${cy-r} L ${cx+r*0.588} ${cy+r*0.809} L ${cx-r} ${cy- r*0.309} L ${cx+r} ${cy- r*0.309} L ${cx-r*0.588} ${cy+r*0.809} Z`); return p; };
        const arrow=(x,y,dir,fill='#27ae60')=>{ const {cx,cy}=cellC(x,y); const d=4; let pts=''; if(dir==='down'){ pts=`${cx-d},${cy-d} ${cx+d},${cy-d} ${cx},${cy+d}`;} else if(dir==='up'){ pts=`${cx-d},${cy+d} ${cx+d},${cy+d} ${cx},${cy-d}`;} else if(dir==='left'){ pts=`${cx+d},${cy-d} ${cx+d},${cy+d} ${cx-d},${cy}`;} else { pts=`${cx-d},${cy-d} ${cx-d},${cy+d} ${cx+d},${cy}`;} const p=document.createElementNS('http://www.w3.org/2000/svg','polygon'); p.setAttribute('points', pts); p.setAttribute('fill', fill); return p; };
        // Homes
        add(rect(10,10,40,40,'#ffccd2','#f5c2c7')); // red home
        add(rect(100,100,40,40,'#cfe0ff','#cfe2ff')); // blue home
        // Center triangles
        add(poly('65,65 85,65 75,75','#2ecc71'));
        add(poly('85,65 85,85 75,75','#f1c40f'));
        add(poly('65,65 65,85 75,75','#e74c3c'));
        add(poly('65,85 85,85 75,75','#3498db'));
        // Simple grid lines along lanes
        for(let i=0;i<6;i++){
            const y=15+i*5; add(rect(70,y,10,1,'#dbeafe')); // red lane
            const y2=85-i*5; add(rect(70,y2,10,1,'#dbeafe')); // blue lane
        }
        // Safe stars tuned to the board
        add(star(2,7)); // left mid
        add(star(7,12)); // bottom mid
        add(star(12,7)); // right mid
        add(star(7,2)); // top mid
        // Entry arrows (direction hints)
        add(arrow(7,0,'down','#2ecc71'));
        add(arrow(14,7,'left','#f1c40f'));
        add(arrow(7,14,'up','#3498db'));
        add(arrow(0,7,'right','#e74c3c'));
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

        // Full state sync for late join or refresh
        this.socket.on('ludo:state', (data) => {
            if (!data || !data.state) return;
            this.state = data.state;
            if (data.currentTurn) this.state.currentTurnUserId = data.currentTurn;
            this.room.currentTurn = data.currentTurn || this.room.currentTurn;
            // ensure mount exists
            if (!this.container) this.mount(document.getElementById('gameBoardContainer'));
            this.render();
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
            // update opponent avatar/label when both players are known
            const opp = (this.state.players || []).find(p => p.userId !== this.user.userId);
            if (opp) {
                this.oppAvatar.textContent = opp.username?.[0] ? opp.username[0].toUpperCase() : '👤';
                const oppLabel = this.boardEl.querySelector('.dice-slot.opponent .dice-label');
                if (oppLabel) oppLabel.textContent = opp.username || 'Opponent';
            }
            this.render();
        });

        this.socket.on('ludo:turnChanged', (data) => {
            if (this.state) this.state.currentTurnUserId = data.nextUserId;
            this.currentDie = 0;
            this.movable = [];
            const opp = (this.state.players || []).find(p => p.userId !== this.user.userId);
            if (opp) {
                const oppLabel = this.boardEl.querySelector('.dice-slot.opponent .dice-label');
                if (oppLabel) oppLabel.textContent = opp.username || 'Opponent';
            }
            this.render();
        });
    }

    getUsername(userId) {
        const pl = (this.state?.players || []).find(p => p.userId === userId);
        return pl?.username || 'Opponent';
    }
}

window.LudoClient = LudoClient;


