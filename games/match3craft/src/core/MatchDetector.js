export class MatchDetector {
    constructor() {
        this.gridSize = 8;
    }
    
    // Convert gems array to 2D grid for easier processing
    createGrid(gems) {
        const grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));
        
        gems.forEach(gem => {
            if (gem.userData && gem.userData.gridX !== undefined && gem.userData.gridY !== undefined) {
                grid[gem.userData.gridY][gem.userData.gridX] = gem;
            }
        });
        
        return grid;
    }
    
    // Find all matches of 3 or more gems
    findMatches(gems) {
        const grid = this.createGrid(gems);
        const matches = [];
        const visited = new Set();
        
        // Check horizontal matches
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize - 2; x++) {
                const match = this.findHorizontalMatch(grid, x, y);
                if (match.length >= 3) {
                    matches.push({
                        type: 'horizontal',
                        gems: match,
                        gemType: match[0].userData.gemType
                    });
                    
                    // Mark gems as visited to avoid duplicate counting
                    match.forEach(gem => visited.add(gem));
                }
            }
        }
        
        // Check vertical matches
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize - 2; y++) {
                const match = this.findVerticalMatch(grid, x, y);
                if (match.length >= 3) {
                    // Only add if gems aren't already part of a match
                    const newGems = match.filter(gem => !visited.has(gem));
                    if (newGems.length >= 3) {
                        matches.push({
                            type: 'vertical',
                            gems: match,
                            gemType: match[0].userData.gemType
                        });
                        
                        match.forEach(gem => visited.add(gem));
                    }
                }
            }
        }
        
        return matches;
    }
    
    findHorizontalMatch(grid, startX, startY) {
        const match = [];
        const startGem = grid[startY][startX];
        
        if (!startGem || !startGem.userData) return match;
        
        const gemType = startGem.userData.gemType;
        
        // Collect consecutive gems of same type
        for (let x = startX; x < this.gridSize; x++) {
            const gem = grid[startY][x];
            if (gem && gem.userData && gem.userData.gemType === gemType) {
                match.push(gem);
            } else {
                break;
            }
        }
        
        return match;
    }
    
    findVerticalMatch(grid, startX, startY) {
        const match = [];
        const startGem = grid[startY][startX];
        
        if (!startGem || !startGem.userData) return match;
        
        const gemType = startGem.userData.gemType;
        
        // Collect consecutive gems of same type
        for (let y = startY; y < this.gridSize; y++) {
            const gem = grid[y][startX];
            if (gem && gem.userData && gem.userData.gemType === gemType) {
                match.push(gem);
            } else {
                break;
            }
        }
        
        return match;
    }
    
    // Get all unique gems from matches (avoiding duplicates)
    getUniqueMatchedGems(matches) {
        const uniqueGems = new Set();
        
        matches.forEach(match => {
            match.gems.forEach(gem => uniqueGems.add(gem));
        });
        
        return Array.from(uniqueGems);
    }
}