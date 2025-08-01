class PackTracker {
    constructor() {
        // Initialize Chart.js configuration
        this.chart = null;
        this.selectedChartType = 'chaser';
        this.probabilityHistory = {
            chasers: [],
            teams: [],
            floors: []
        };
        this.lastProbabilities = null; // Store last probabilities to detect changes
        this.totalPacks = 60;
        this.initialCounts = {
            chasers: 8,
            teams: 32,
            floors: 20
        };
        
        // Get project ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        this.projectId = urlParams.get('project');
        
        if (!this.projectId) {
            window.location.href = '../../home.html';
            return;
        }

        // Add complete button to header
        const headerControls = document.querySelector('.header-controls');
        this.completeBtn = document.createElement('button');
        this.completeBtn.className = 'control-btn success-btn';
        this.completeBtn.textContent = 'Mark Complete';
        this.completeBtn.addEventListener('click', () => this.markComplete());
        
        // Check if project is already completed
        const projects = JSON.parse(localStorage.getItem('packTrackerProjects') || '[]');
        const project = projects.find(p => p.id === this.projectId);
        if (project && project.completed) {
            this.completeBtn.disabled = true;
            this.completeBtn.style.display = 'none';
        }
        
        headerControls.appendChild(this.completeBtn);

        // Add back to dashboard button
        const dashboardBtn = document.createElement('button');
        dashboardBtn.className = 'control-btn';
        dashboardBtn.textContent = 'Back to Dashboard';
        dashboardBtn.addEventListener('click', () => window.location.href = '../../home.html');
        headerControls.insertBefore(dashboardBtn, headerControls.firstChild);

        this.teams = [
            '49ers', 'Bears', 'Bengals', 'Bills', 'Broncos', 'Browns', 'Buccaneers', 'Cardinals',
            'Chargers', 'Chiefs', 'Colts', 'Commanders', 'Cowboys', 'Dolphins', 'Eagles', 'Falcons',
            'Giants', 'Jaguars', 'Jets', 'Lions', 'Packers', 'Panthers', 'Patriots', 'Raiders',
            'Rams', 'Ravens', 'Saints', 'Seahawks', 'Steelers', 'Texans', 'Titans', 'Vikings'
        ];
        
        this.packs = new Array(this.totalPacks).fill(null).map((_, index) => ({
            number: index + 1,
            status: 'unopened',
            team: null
        }));
        
        this.actionHistory = [];
        this.teamsPulled = new Set();
        this.chasersPulled = new Set(); // Track which chasers have been pulled
        this.pulledPacks = new Set(); // Track packs that were actually pulled by the user
        
        this.initializeUI();
        this.loadState();
        this.initializeChart();
        this.updateUI();
        this.initializeProbabilityHistory();
    }

    initializeChart() {
        const ctx = document.getElementById('probabilityChart').getContext('2d');
        
        // Calculate baseline probabilities
        const baselineProbabilities = {
            chaser: (this.initialCounts.chasers / this.totalPacks) * 100,
            team: (this.initialCounts.teams / this.totalPacks) * 100,
            floor: (this.initialCounts.floors / this.totalPacks) * 100
        };

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Current Probability',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        spanGaps: false, // Don't connect through null values
                        borderWidth: 3, // Slightly thicker line for better curve visibility
                        cubicInterpolationMode: 'default' // Natural curve interpolation
                    },
                    {
                        label: 'Baseline',
                        data: [],
                        borderColor: 'rgba(200, 200, 200, 0.8)',
                        borderWidth: 1,
                        tension: 0, // Keep baseline straight
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.dataset.label;
                                const value = context.parsed.y.toFixed(2);
                                if (label === 'Current Probability') {
                                    const baseline = baselineProbabilities[this.selectedChartType];
                                    const deviation = (context.parsed.y - baseline).toFixed(2);
                                    const sign = deviation >= 0 ? '+' : '';
                                    return `${label}: ${value}% (${sign}${deviation}% from baseline)`;
                                }
                                return `${label}: ${value}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Pack Number',
                            padding: { top: 20 } // Add padding to account for rotated labels
                        },
                        ticks: {
                            callback: (value) => value,
                            autoSkip: false, // Show all ticks
                            maxRotation: 0,
                            minRotation: 0,
                            font: {
                                size: 10 // Smaller font size to help fit all numbers
                            }
                        },
                        min: 0,
                        max: 60
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Probability'
                        },
                        min: 0,
                        suggestedMax: 25,
                        ticks: {
                            callback: (value) => `${Math.round(value)}%`
                        }
                    }
                }
            }
        });

        // Add event listeners for chart type toggles
        document.querySelectorAll('.chart-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                document.querySelectorAll('.chart-toggle').forEach(t => t.classList.remove('active'));
                toggle.classList.add('active');
                this.selectedChartType = toggle.dataset.type;
                this.updateChart();
            });
        });
    }

    updateChart() {
        // console.log('updateChart called');
        if (!this.chart) {
            // console.log('Chart is null, returning');
            return;
        }

        const baselineProbabilities = {
            chaser: (this.initialCounts.chasers / this.totalPacks) * 100,
            team: (this.initialCounts.teams / this.totalPacks) * 100,
            floor: (this.initialCounts.floors / this.totalPacks) * 100
        };

        const currentProbs = this.probabilityHistory[this.selectedChartType + 's'];
        // console.log('Selected chart type:', this.selectedChartType);
        // console.log('Current probabilities:', currentProbs);
        
        // Map pack numbers to sequential positions for the chart
        const displayData = new Array(this.totalPacks + 1).fill(null);
        displayData[0] = currentProbs[0]; // Always show the zero point
        
        // Find all opened packs and map them to sequential positions
        const openedPacks = [];
        for (let i = 1; i <= this.totalPacks; i++) {
            if (currentProbs[i] !== null) {
                openedPacks.push({ packNumber: i, probability: currentProbs[i] });
            }
        }
        
        // Sort by pack number and assign to sequential positions
        openedPacks.sort((a, b) => a.packNumber - b.packNumber);
        openedPacks.forEach((pack, sequentialIndex) => {
            displayData[sequentialIndex + 1] = pack.probability;
        });
        
        // Always create 61 labels (0-60) for all packs
        const labels = Array.from({ length: this.totalPacks + 1 }, (_, i) => i);
        const baselineData = Array(this.totalPacks + 1).fill(baselineProbabilities[this.selectedChartType]);

        // Update chart colors based on selected type
        let color;
        switch (this.selectedChartType) {
            case 'chaser':
                color = getComputedStyle(document.documentElement).getPropertyValue('--color-chaser').trim();
                break;
            case 'team':
                color = getComputedStyle(document.documentElement).getPropertyValue('--color-team').trim();
                break;
            case 'floor':
                color = getComputedStyle(document.documentElement).getPropertyValue('--color-floor').trim();
                break;
        }

        // console.log('Chart data being set:');
        // console.log('Labels:', labels);
        // console.log('Display data:', displayData);
        // console.log('Baseline data:', baselineData);
        
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = displayData;
        this.chart.data.datasets[0].borderColor = color;
        this.chart.data.datasets[1].data = baselineData;

        // Update y-axis scale if needed
        const maxProb = Math.max(...currentProbs, baselineProbabilities[this.selectedChartType]);
        // console.log('Max probability:', maxProb);
        this.chart.options.scales.y.suggestedMax = Math.ceil(maxProb / 5) * 5;

        // console.log('Calling chart.update()');
        this.chart.update();
        // console.log('Chart update complete');

        // Update deviation badge
        if (currentProbs.length > 0) {
            // Calculate the current probability for the next selection
            const currentProb = this.calculateNextProbability(this.selectedChartType);
            
            const baseline = baselineProbabilities[this.selectedChartType];
            const deviation = currentProb - baseline;
            const deviationBadge = document.querySelector('.deviation-badge');
            const formattedDeviation = Math.abs(deviation).toFixed(2);
            
            deviationBadge.textContent = `${deviation >= 0 ? '+' : '-'}${formattedDeviation}%`;
            deviationBadge.title = "Deviation of the NEXT pick's probability from the baseline";
            // Determine badge class based on deviation range
            let badgeClass;
            if (deviation >= 3.00) {
                badgeClass = 'positive';
            } else if (deviation >= 0.01 && deviation < 3.00) {
                badgeClass = 'neutral';
            } else if (deviation === 0.00) {
                badgeClass = 'zero';
            } else {
                badgeClass = 'negative';
            }
            deviationBadge.className = `deviation-badge ${badgeClass}`;
        }
    }

    initializeUI() {
        // Initialize pack grid
        const packGrid = document.getElementById('packGrid');
        this.packs.forEach((pack, index) => {
            const packButton = document.createElement('button');
            packButton.className = 'pack';
            packButton.textContent = index + 1;
            packButton.addEventListener('click', () => this.openPackModal(index));
            packGrid.appendChild(packButton);
        });

        // Initialize teams grid
        const teamsGrid = document.getElementById('teamsGrid');
        this.teams.forEach(team => {
            const teamDiv = document.createElement('div');
            teamDiv.className = 'team-item';
            teamDiv.textContent = team;
            teamDiv.dataset.team = team; // Add data attribute for team name
            
            // If team is already pulled, apply the color
            if (this.teamsPulled.has(team)) {
                teamDiv.classList.add('pulled');
                teamDiv.style.backgroundColor = teamColors[team];
            } else {
                // Set a light background for unpulled teams
                teamDiv.style.backgroundColor = 'var(--color-unopened)';
            }
            
            teamsGrid.appendChild(teamDiv);
        });

        // Initialize pulled packs grid
        const pulledPacksGrid = document.getElementById('pulledPacksGrid');
        // This will be populated as packs are marked as pulled

        // Initialize modal team selection
        const teamSelection = document.getElementById('teamSelection');
        this.teams.forEach(team => {
            const teamButton = document.createElement('button');
            teamButton.className = 'status-btn team-btn';
            teamButton.textContent = team;
            teamButton.style.backgroundColor = teamColors[team];
            // Use white text for all except Steelers and Saints which have light colors
            teamButton.style.color = team === 'Steelers' || team === 'Saints' ? '#000000' : '#FFFFFF';
            teamButton.addEventListener('click', () => this.markPack(this.selectedPack, 'team', team));
            teamSelection.appendChild(teamButton);
        });

        // Initialize modal chaser selection
        const chaserSelection = document.getElementById('chaserSelection');
        for (let i = 1; i <= 8; i++) {
            const chaserButton = document.createElement('button');
            chaserButton.className = 'status-btn chaser-btn';
            chaserButton.textContent = i;
            chaserButton.style.backgroundColor = 'var(--color-chaser)';
            chaserButton.style.color = 'white';
            chaserButton.addEventListener('click', () => this.markPack(this.selectedPack, 'chaser', null, i));
            chaserSelection.appendChild(chaserButton);
        }

        // Event listeners
        document.getElementById('resetBtn').addEventListener('click', () => this.resetAll());
        
        // Modal event listeners
        const modal = document.getElementById('packModal');
        const modalContent = modal.querySelector('.modal-content');
        
        // Status button event listeners
        const statusButtons = modal.querySelectorAll('.status-btn[data-status]');
        statusButtons.forEach(button => {
            button.addEventListener('click', () => {
                const status = button.getAttribute('data-status');
                if (status === 'team') {
                    teamSelection.style.display = 'grid';
                    chaserSelection.style.display = 'none';
                } else if (status === 'chaser') {
                    chaserSelection.style.display = 'grid';
                    teamSelection.style.display = 'none';
                } else {
                    // Floor - no additional selection needed
                    teamSelection.style.display = 'none';
                    chaserSelection.style.display = 'none';
                    this.markPack(this.selectedPack, status);
                }
            });
        });
        
        // Close on clicking the close button
        document.getElementById('closeModal').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        // Close on clicking outside the modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
        
        // Prevent clicks inside modal from bubbling up
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    openPackModal(packIndex) {
        this.selectedPack = packIndex;
        const modal = document.getElementById('packModal');
        const teamSelection = document.getElementById('teamSelection');
        const checkbox = document.getElementById('packPulledCheckbox');
        
        // Set checkbox based on whether this pack was previously marked as pulled
        checkbox.checked = this.pulledPacks.has(packIndex);
        
        // Reset team and chaser selection display
        teamSelection.style.display = 'none';
        const chaserSelection = document.getElementById('chaserSelection');
        chaserSelection.style.display = 'none';
        
        // Calculate current counts for each pack type
        const currentChasers = this.packs.filter(pack => pack.status === 'chaser').length;
        const currentTeams = this.packs.filter(pack => pack.status === 'team').length;
        const currentFloors = this.packs.filter(pack => pack.status === 'floor').length;
        
        // Update status buttons based on limits
        const statusButtons = modal.querySelectorAll('.status-btn[data-status]');
        statusButtons.forEach(button => {
            const status = button.getAttribute('data-status');
            let isDisabled = false;
            
            switch (status) {
                case 'chaser':
                    isDisabled = currentChasers >= this.initialCounts.chasers;
                    break;
                case 'team':
                    isDisabled = currentTeams >= this.initialCounts.teams;
                    break;
                case 'floor':
                    isDisabled = currentFloors >= this.initialCounts.floors;
                    break;
            }
            
            button.disabled = isDisabled;
            if (isDisabled) {
                button.style.opacity = '0.5';
                button.style.cursor = 'not-allowed';
            } else {
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
            }
        });
        
        // Update disabled state of team buttons based on what's already selected
        const selectedTeams = new Set(this.packs
            .filter(pack => pack.status === 'team' && pack.team)
            .map(pack => pack.team)
        );
        
        teamSelection.querySelectorAll('button').forEach(button => {
            const teamName = button.textContent;
            button.disabled = selectedTeams.has(teamName);
            if (button.disabled) {
                button.style.opacity = '0.5';
                button.style.cursor = 'not-allowed';
            } else {
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
            }
        });

        // Update disabled state of chaser buttons based on what's already selected
        const selectedChasers = new Set(this.packs
            .filter(pack => pack.status === 'chaser' && pack.chaser)
            .map(pack => pack.chaser)
        );
        
        chaserSelection.querySelectorAll('button').forEach(button => {
            const chaserNumber = parseInt(button.textContent);
            button.disabled = selectedChasers.has(chaserNumber);
            if (button.disabled) {
                button.style.opacity = '0.5';
                button.style.cursor = 'not-allowed';
            } else {
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
            }
        });
        
        modal.style.display = 'flex';
    }

    markPack(packIndex, type, teamName = null, chaserNumber = null) {
        // console.log(`markPack called: packIndex=${packIndex}, type=${type}, teamName=${teamName}, chaserNumber=${chaserNumber}`);
        const oldState = JSON.parse(JSON.stringify(this.packs[packIndex]));
        const pack = this.packs[packIndex];
        const checkbox = document.getElementById('packPulledCheckbox');

        // Check if this pack was marked as pulled by the user
        if (checkbox.checked) {
            this.pulledPacks.add(packIndex);
        } else {
            this.pulledPacks.delete(packIndex);
        }

        // Remove old team if it was a team pack
        if (pack.status === 'team' && pack.team) {
            this.updateTeamTracker(pack.team, false);
        }

        // Remove old chaser if it was a chaser pack
        if (pack.status === 'chaser' && pack.chaser) {
            this.chasersPulled.delete(pack.chaser);
        }

        pack.status = type;
        pack.team = type === 'team' ? teamName : null;
        pack.chaser = type === 'chaser' ? chaserNumber : null;

        if (type === 'team' && teamName) {
            this.updateTeamTracker(teamName, true);
        }

        if (type === 'chaser' && chaserNumber) {
            this.chasersPulled.add(chaserNumber);
        }

        this.actionHistory.push({
            type: 'markPack',
            packIndex,
            oldState
        });

        this.updateUI();
        this.updateProbabilityHistory();
        this.saveState();
        document.getElementById('packModal').style.display = 'none';
    }

    updateTeamTracker(teamName, isPulled) {
        if (isPulled) {
            this.teamsPulled.add(teamName);
        } else {
            this.teamsPulled.delete(teamName);
        }

        const teamsGrid = document.getElementById('teamsGrid');
        teamsGrid.querySelectorAll('.team-item').forEach(teamDiv => {
            if (teamDiv.textContent === teamName) {
                teamDiv.classList.toggle('pulled', isPulled);
                teamDiv.style.backgroundColor = isPulled ? teamColors[teamName] : 'var(--color-unopened)';
            }
        });
    }

    calculateProbabilities() {
        const unopenedCount = this.packs.filter(pack => pack.status === 'unopened').length;
        if (unopenedCount === 0) return { chaser: 0, team: 0, floor: 0 };

        const remainingChasers = this.initialCounts.chasers - 
            this.packs.filter(pack => pack.status === 'chaser').length;
        const remainingTeams = this.initialCounts.teams - 
            this.packs.filter(pack => pack.status === 'team').length;
        const remainingFloors = this.initialCounts.floors - 
            this.packs.filter(pack => pack.status === 'floor').length;

        return {
            chaser: (remainingChasers / unopenedCount) * 100,
            team: (remainingTeams / unopenedCount) * 100,
            floor: (remainingFloors / unopenedCount) * 100
        };
    }

    calculateNextProbability(type) {
        const unopenedCount = this.packs.filter(pack => pack.status === 'unopened').length;
        if (unopenedCount === 0) return 0;

        let remaining;
        if (type === 'chaser') {
            remaining = this.initialCounts.chasers - this.packs.filter(pack => pack.status === 'chaser').length;
        } else if (type === 'team') {
            remaining = this.initialCounts.teams - this.packs.filter(pack => pack.status === 'team').length;
        } else {
            remaining = this.initialCounts.floors - this.packs.filter(pack => pack.status === 'floor').length;
        }

        return (remaining / unopenedCount) * 100;
    }

    updateProbabilityHistory(forceUpdate = false) {
        // console.log('updateProbabilityHistory called');
        const baselineProbabilities = {
            chasers: (this.initialCounts.chasers / this.totalPacks) * 100,
            teams: (this.initialCounts.teams / this.totalPacks) * 100,
            floors: (this.initialCounts.floors / this.totalPacks) * 100
        };
        // console.log('Baseline probabilities:', baselineProbabilities);

        // Initialize arrays if they're empty
        if (this.probabilityHistory.chasers.length === 0) {
            // console.log('Initializing probability history arrays');
            // Add one extra slot for the zero point
            this.probabilityHistory.chasers = [baselineProbabilities.chasers, ...new Array(this.totalPacks).fill(null)];
            this.probabilityHistory.teams = [baselineProbabilities.teams, ...new Array(this.totalPacks).fill(null)];
            this.probabilityHistory.floors = [baselineProbabilities.floors, ...new Array(this.totalPacks).fill(null)];
        }

        // Update probabilities for each marked pack
        const markedPacks = this.packs.filter(pack => pack.status !== 'unopened')
                                    .sort((a, b) => a.number - b.number);
        // console.log('Marked packs:', markedPacks);

        markedPacks.forEach(pack => {
            const packIndex = pack.number;  // Pack numbers are 1-based
            const packsBeforeThis = this.packs.filter(p => p.number < packIndex && p.status !== 'unopened');
            const unopenedCountAtTime = this.totalPacks - packsBeforeThis.length;
            
            // console.log(`Pack ${packIndex}: packsBeforeThis=${packsBeforeThis.length}, unopenedCountAtTime=${unopenedCountAtTime}`);
            
            if (unopenedCountAtTime > 0) {
                const remainingChasers = this.initialCounts.chasers - packsBeforeThis.filter(p => p.status === 'chaser').length;
                const remainingTeams = this.initialCounts.teams - packsBeforeThis.filter(p => p.status === 'team').length;
                const remainingFloors = this.initialCounts.floors - packsBeforeThis.filter(p => p.status === 'floor').length;

                this.probabilityHistory.chasers[packIndex] = (remainingChasers / unopenedCountAtTime) * 100;
                this.probabilityHistory.teams[packIndex] = (remainingTeams / unopenedCountAtTime) * 100;
                this.probabilityHistory.floors[packIndex] = (remainingFloors / unopenedCountAtTime) * 100;
                
                // console.log(`Pack ${packIndex} probabilities: chaser=${this.probabilityHistory.chasers[packIndex]}, team=${this.probabilityHistory.teams[packIndex]}, floor=${this.probabilityHistory.floors[packIndex]}`);
            }
        });

        // Update last probabilities for the deviation badge
        this.lastProbabilities = {
            chaser: this.calculateNextProbability('chaser'),
            team: this.calculateNextProbability('team'),
            floor: this.calculateNextProbability('floor')
        };
        
        this.updateChart();
    }

    initializeProbabilityHistory() {
        // Clear existing history
        this.probabilityHistory = {
            chasers: [],
            teams: [],
            floors: []
        };
        this.lastProbabilities = null;

        // Count non-unopened packs to determine how many steps to simulate
        const markedPacks = this.packs.filter(pack => pack.status !== 'unopened').length;
        
        if (markedPacks > 0) {
            // Create a temporary copy of packs
            const tempPacks = [...this.packs];
            
            // Reset all packs to unopened
            this.packs = new Array(this.totalPacks).fill(null).map((_, index) => ({
                number: index + 1,
                status: 'unopened',
                team: null,
                chaser: null
            }));
            
            // Simulate marking each pack in sequence
            for (let i = 0; i < tempPacks.length; i++) {
                if (tempPacks[i].status !== 'unopened') {
                    this.packs[i] = tempPacks[i];
                    this.updateProbabilityHistory(true);
                }
            }
        } else {
            // If no packs are marked, just add initial probabilities
            this.updateProbabilityHistory(true);
        }
    }

    updateOverviewTable() {
        const overviewTableBody = document.getElementById('overviewTableBody');
        overviewTableBody.innerHTML = '';

        // Get baseline probabilities
        const baselineProbabilities = {
            chaser: (this.initialCounts.chasers / this.totalPacks) * 100,
            team: (this.initialCounts.teams / this.totalPacks) * 100,
            floor: (this.initialCounts.floors / this.totalPacks) * 100
        };

        // Create rows for all 60 positions
        for (let i = 0; i < this.totalPacks; i++) {
            // Find the pack with this number (i + 1)
            const pack = this.packs.find(p => p.number === i + 1) || {
                number: i + 1,
                status: 'unopened',
                team: null,
                chaser: null
            };
            const row = document.createElement('tr');
            
            // Pack Number
            const packNumberCell = document.createElement('td');
            packNumberCell.textContent = i + 1;
            row.appendChild(packNumberCell);
            
            // Type
            const typeCell = document.createElement('td');
            if (pack.status !== 'unopened') {
                const typeBadge = document.createElement('span');
                typeBadge.className = `pulled-pack-type-badge ${pack.status}`;
                
                if (pack.status === 'team' && pack.team) {
                    typeBadge.textContent = pack.team;
                    typeBadge.style.backgroundColor = teamColors[pack.team];
                    typeBadge.style.color = pack.team === 'Steelers' || pack.team === 'Saints' ? '#000000' : '#FFFFFF';
                } else if (pack.status === 'chaser' && pack.chaser) {
                    typeBadge.textContent = `Chaser #${pack.chaser}`;
                } else {
                    typeBadge.textContent = pack.status.charAt(0).toUpperCase() + pack.status.slice(1);
                }
                
                typeCell.appendChild(typeBadge);
            } else {
                typeCell.textContent = '-';
            }
            row.appendChild(typeCell);
            
            // Baseline Probability
            const probCell = document.createElement('td');
            if (pack.status !== 'unopened') {
                const probContainer = document.createElement('div');
                probContainer.className = 'baseline-probability';
                
                // Calculate probabilities at the time this pack was marked
                const packsBeforeThis = this.packs.filter(p => p.number < pack.number);
                const unopenedCountAtTime = this.totalPacks - packsBeforeThis.filter(p => p.status !== 'unopened').length;
                
                let baseline, currentProb;
                if (pack.status === 'chaser') {
                    baseline = baselineProbabilities.chaser;
                    const remainingChasers = this.initialCounts.chasers - 
                        packsBeforeThis.filter(p => p.status === 'chaser').length;
                    currentProb = unopenedCountAtTime > 0 ? (remainingChasers / unopenedCountAtTime) * 100 : 0;
                } else if (pack.status === 'team') {
                    baseline = baselineProbabilities.team;
                    const remainingTeams = this.initialCounts.teams - 
                        packsBeforeThis.filter(p => p.status === 'team').length;
                    currentProb = unopenedCountAtTime > 0 ? (remainingTeams / unopenedCountAtTime) * 100 : 0;
                } else {
                    baseline = baselineProbabilities.floor;
                    const remainingFloors = this.initialCounts.floors - 
                        packsBeforeThis.filter(p => p.status === 'floor').length;
                    currentProb = unopenedCountAtTime > 0 ? (remainingFloors / unopenedCountAtTime) * 100 : 0;
                }
                
                const deviation = currentProb - baseline;
                const formattedDeviation = Math.abs(deviation).toFixed(2);
                
                // Add deviation badge
                const deviationBadge = document.createElement('span');
                deviationBadge.className = 'deviation';
                if (deviation >= 3.00) {
                    deviationBadge.classList.add('positive');
                } else if (deviation >= 0.01 && deviation < 3.00) {
                    deviationBadge.classList.add('neutral');
                } else if (deviation === 0.00) {
                    deviationBadge.classList.add('zero');
                } else {
                    deviationBadge.classList.add('negative');
                }
                deviationBadge.textContent = `${deviation >= 0 ? '+' : '-'}${formattedDeviation}%`;
                probContainer.appendChild(deviationBadge);
                
                probCell.appendChild(probContainer);
            } else {
                probCell.textContent = '-';
            }
            row.appendChild(probCell);
            
            overviewTableBody.appendChild(row);
        }
    }

    updateUI() {
        // Update pack grid
        this.packs.forEach((pack, index) => {
            const packButton = document.querySelectorAll('.pack')[index];
            packButton.className = `pack ${pack.status}`;
            if (pack.status === 'team' && pack.team) {
                packButton.title = pack.team;
            } else if (pack.status === 'chaser' && pack.chaser) {
                packButton.title = `Chaser - ${pack.chaser}`;
            }
        });

        // Update probabilities for next pick
        const chaserProb = this.calculateNextProbability('chaser');
        const teamProb = this.calculateNextProbability('team');
        const floorProb = this.calculateNextProbability('floor');
        
        document.getElementById('chaserProb').textContent = `${chaserProb.toFixed(2)}%`;
        document.getElementById('teamProb').textContent = `${teamProb.toFixed(2)}%`;
        document.getElementById('floorProb').textContent = `${floorProb.toFixed(2)}%`;

        // Update remaining packs
        this.updateRemainingPacks();

        // Update teams grid
        const teamsGrid = document.getElementById('teamsGrid');
        teamsGrid.querySelectorAll('.team-item').forEach(teamDiv => {
            teamDiv.classList.toggle('pulled', this.teamsPulled.has(teamDiv.textContent));
        });

        // Update pulled packs display
        this.updatePulledPacksDisplay();

        // Update overview table
        this.updateOverviewTable();
    }

    updateRemainingPacks() {
        const currentChasers = this.packs.filter(pack => pack.status === 'chaser').length;
        const currentTeams = this.packs.filter(pack => pack.status === 'team').length;
        const currentFloors = this.packs.filter(pack => pack.status === 'floor').length;

        const remainingChasers = this.initialCounts.chasers - currentChasers;
        const remainingTeams = this.initialCounts.teams - currentTeams;
        const remainingFloors = this.initialCounts.floors - currentFloors;

        document.getElementById('chaserRemaining').textContent = `${remainingChasers}/${this.initialCounts.chasers}`;
        document.getElementById('teamRemaining').textContent = `${remainingTeams}/${this.initialCounts.teams}`;
        document.getElementById('floorRemaining').textContent = `${remainingFloors}/${this.initialCounts.floors}`;
    }

    updatePulledPacksDisplay() {
        const pulledPacksTableBody = document.getElementById('pulledPacksTableBody');
        pulledPacksTableBody.innerHTML = ''; // Clear existing content

        // Check if there are any pulled packs
        const validPulledPacks = Array.from(this.pulledPacks).filter(packIndex => {
            const pack = this.packs[packIndex];
            return pack && pack.status !== 'unopened';
        });

        if (validPulledPacks.length === 0) {
            // Display message when no packs are pulled
            const messageRow = document.createElement('tr');
            const messageCell = document.createElement('td');
            messageCell.colSpan = 3;
            messageCell.textContent = "You haven't picked anything yet";
            messageCell.style.textAlign = 'center';
            messageCell.style.color = 'var(--color-grey-600)';
            messageCell.style.fontSize = 'var(--font-size-lg)';
            messageCell.style.padding = 'var(--spacing-xl)';
            messageRow.appendChild(messageCell);
            pulledPacksTableBody.appendChild(messageRow);
        } else {
            // Add pulled packs to the table
            this.pulledPacks.forEach(packIndex => {
                const pack = this.packs[packIndex];
                if (pack && pack.status !== 'unopened') {
                    const tableRow = document.createElement('tr');
                    
                    // Pack Number column
                    const packNumberCell = document.createElement('td');
                    packNumberCell.textContent = packIndex + 1;
                    tableRow.appendChild(packNumberCell);
                    
                    // Type column
                    const typeCell = document.createElement('td');
                    const typeBadge = document.createElement('span');
                    typeBadge.className = `pulled-pack-type-badge ${pack.status}`;
                    
                    if (pack.status === 'team' && pack.team) {
                        typeBadge.textContent = pack.team;
                        typeBadge.style.backgroundColor = teamColors[pack.team];
                        // Use white text for all except Steelers and Saints which have light colors
                        typeBadge.style.color = pack.team === 'Steelers' || pack.team === 'Saints' ? '#000000' : '#FFFFFF';
                    } else if (pack.status === 'chaser' && pack.chaser) {
                        typeBadge.textContent = `Chaser #${pack.chaser}`;
                    } else {
                        typeBadge.textContent = pack.status.charAt(0).toUpperCase() + pack.status.slice(1);
                    }
                    
                    typeCell.appendChild(typeBadge);
                    tableRow.appendChild(typeCell);
                    
                    // Actions column
                    const actionsCell = document.createElement('td');
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'pulled-pack-delete-btn';
                    deleteBtn.addEventListener('click', () => this.removePulledPack(packIndex));
                    deleteBtn.innerHTML = this.getTrashIconSVG();
                    
                    // Disable delete button if project is completed
                    const projects = JSON.parse(localStorage.getItem('packTrackerProjects') || '[]');
                    const project = projects.find(p => p.id === this.projectId);
                    if (project && project.completed) {
                        deleteBtn.disabled = true;
                        deleteBtn.style.opacity = '0.3';
                        deleteBtn.style.cursor = 'not-allowed';
                    }
                    actionsCell.appendChild(deleteBtn);
                    tableRow.appendChild(actionsCell);
                    
                    pulledPacksTableBody.appendChild(tableRow);
                }
            });
        }
    }

    removePulledPack(packIndex) {
        if (confirm('Are you sure you want to remove this pack from your pulled list?')) {
            this.pulledPacks.delete(packIndex);
            this.updatePulledPacksDisplay();
            this.saveState();
        }
    }

    getTrashIconSVG() {
        return `<svg class="pulled-pack-trash-icon" viewBox="0 0 24 24">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>`;
    }

    undoLastAction() {
        const lastAction = this.actionHistory.pop();
        if (!lastAction) return;

        if (lastAction.type === 'markPack') {
            const pack = this.packs[lastAction.packIndex];
            if (pack.status === 'team' && pack.team) {
                this.updateTeamTracker(pack.team, false);
            }
            Object.assign(pack, lastAction.oldState);
            if (pack.status === 'team' && pack.team) {
                this.updateTeamTracker(pack.team, true);
            }
        }

        this.updateUI();
        this.saveState();
    }

    saveState() {
        const state = {
            packs: this.packs,
            teamsPulled: Array.from(this.teamsPulled),
            chasersPulled: Array.from(this.chasersPulled),
            actionHistory: this.actionHistory,
            pulledPacks: Array.from(this.pulledPacks),
            probabilityHistory: this.probabilityHistory,
            lastProbabilities: this.lastProbabilities
        };
        localStorage.setItem(`packTracker_${this.projectId}`, JSON.stringify(state));
    }

    loadState() {
        // Get project details
        const projects = JSON.parse(localStorage.getItem('packTrackerProjects') || '[]');
        const project = projects.find(p => p.id === this.projectId);
        
        if (!project) {
            window.location.href = '../../home.html';
            return;
        }

        // Set project name in header
        document.querySelector('header h1').textContent = project.name;

        // Update UI based on completion status
        if (project.completed) {
            this.makeReadOnly();
        }

        // Load project state
        const savedState = localStorage.getItem(`packTracker_${this.projectId}`);
        if (savedState) {
            const state = JSON.parse(savedState);
            this.packs = state.packs;
            this.teamsPulled = new Set(state.teamsPulled);
            this.chasersPulled = new Set(state.chasersPulled || []);
            this.actionHistory = state.actionHistory;
            this.pulledPacks = new Set(state.pulledPacks || []);
            this.probabilityHistory = state.probabilityHistory || { chasers: [], teams: [], floors: [] };
            this.lastProbabilities = state.lastProbabilities;

            // Reapply team colors to pulled teams
            const teamsGrid = document.getElementById('teamsGrid');
            teamsGrid.querySelectorAll('.team-item').forEach(teamDiv => {
                const teamName = teamDiv.textContent;
                if (this.teamsPulled.has(teamName)) {
                    teamDiv.classList.add('pulled');
                    teamDiv.style.backgroundColor = teamColors[teamName];
                } else {
                    teamDiv.classList.remove('pulled');
                    teamDiv.style.backgroundColor = 'var(--color-unopened)';
                }
            });
        }
    }

    makeReadOnly() {
        // Make packs non-clickable but still visible
        document.querySelectorAll('.pack').forEach(pack => {
            pack.disabled = true;
            // Remove hover effect
            pack.style.transform = 'none';
            pack.style.transition = 'none';
        });

        // Hide all buttons except "Back to Dashboard"
        document.getElementById('resetBtn').style.display = 'none';
        this.completeBtn.style.display = 'none';
    }

    markComplete() {
        if (!confirm('Are you sure you want to mark this project as complete? It will become read-only.')) {
            return;
        }

        const projects = JSON.parse(localStorage.getItem('packTrackerProjects') || '[]');
        const projectIndex = projects.findIndex(p => p.id === this.projectId);
        
        if (projectIndex !== -1) {
            projects[projectIndex].completed = true;
            localStorage.setItem('packTrackerProjects', JSON.stringify(projects));
            this.makeReadOnly();
            
            // Disable and hide the complete button
            this.completeBtn.disabled = true;
            this.completeBtn.style.display = 'none';
        }
    }

    resetAll() {
        if (!confirm('Are you sure you want to reset all progress?')) return;
        
        this.packs = new Array(this.totalPacks).fill(null).map((_, index) => ({
            number: index + 1,
            status: 'unopened',
            team: null,
            chaser: null
        }));
        this.teamsPulled.clear();
        this.chasersPulled.clear();
        this.pulledPacks.clear();
        this.actionHistory = [];
        this.probabilityHistory = {
            chasers: [],
            teams: [],
            floors: []
        };
        this.lastProbabilities = null;

        // Clear and reset the chart
        if (this.chart) {
            // Get baseline probability for current type
            const baselineProbabilities = {
                chaser: (this.initialCounts.chasers / this.totalPacks) * 100,
                team: (this.initialCounts.teams / this.totalPacks) * 100,
                floor: (this.initialCounts.floors / this.totalPacks) * 100
            };

            // Create empty data array for current probability line
            this.chart.data.datasets[0].data = [];
            
            // Create baseline data array
            const labels = Array.from({ length: this.totalPacks }, (_, i) => i);
            const baselineData = Array(this.totalPacks).fill(baselineProbabilities[this.selectedChartType]);
            
            this.chart.data.labels = labels;
            this.chart.data.datasets[1].data = baselineData;
            this.chart.update();
            
            // Reset the deviation badge
            const deviationBadge = document.querySelector('.deviation-badge');
            if (deviationBadge) {
                deviationBadge.textContent = '±0.00%';
                deviationBadge.className = 'deviation-badge neutral';
            }
        }

        // Reset all team items to unopened state
        const teamsGrid = document.getElementById('teamsGrid');
        teamsGrid.querySelectorAll('.team-item').forEach(teamDiv => {
            teamDiv.classList.remove('pulled');
            teamDiv.style.backgroundColor = 'var(--color-unopened)';
        });

        this.updateUI();
        this.saveState();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.packTracker = new PackTracker();
});