export interface GameStats {
  wpm: number;
  accuracy: number;
  score: number;
  wordsCompleted: number;
  charactersTyped: number;
  errors: number;
  timeElapsed: number;
}

export class PerformanceTracker {
  private startTime: number = 0;
  private lastUpdateTime: number = 0;
  private stats: GameStats;
  private wordHistory: Array<{ word: string; accuracy: number; timestamp: number }> = [];
  private recentWords: Array<{ word: string; timestamp: number }> = [];

  constructor() {
    this.stats = {
      wpm: 0,
      accuracy: 100,
      score: 0,
      wordsCompleted: 0,
      charactersTyped: 0,
      errors: 0,
      timeElapsed: 0
    };
  }

  public initialize(): void {
    this.resetStats();
  }

  public startSession(): void {
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
    this.resetStats();
  }

  public endSession(): GameStats {
    const finalStats = { ...this.stats };
    this.saveSessionData(finalStats);
    return finalStats;
  }

  public update(): number {
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
    
    this.stats.timeElapsed = (currentTime - this.startTime) / 1000;
    this.updateWPM();
    
    this.lastUpdateTime = currentTime;
    return deltaTime;
  }

  public recordWordCompletion(word: string, accuracy: number): void {
    const timestamp = Date.now();
    
    this.wordHistory.push({ word, accuracy, timestamp });
    this.recentWords.push({ word, timestamp });
    
    // Keep only recent words for WPM calculation (last 60 seconds)
    const cutoffTime = timestamp - 60000;
    this.recentWords = this.recentWords.filter(w => w.timestamp > cutoffTime);
    
    this.stats.wordsCompleted++;
    this.stats.charactersTyped += word.length;
    
    if (accuracy < 100) {
      const errorCount = Math.ceil((100 - accuracy) / 100 * word.length);
      this.stats.errors += errorCount;
    }
    
    this.updateAccuracy();
    this.updateScore(word, accuracy);
  }

  public recordError(): void {
    this.stats.errors++;
    this.updateAccuracy();
  }

  private updateWPM(): void {
    if (this.stats.timeElapsed < 1) {
      this.stats.wpm = 0;
      return;
    }

    // Calculate WPM based on recent words (sliding window)
    const timeWindow = Math.min(this.stats.timeElapsed, 60); // Use up to 60 seconds
    const wordsInWindow = this.recentWords.length;
    
    this.stats.wpm = (wordsInWindow / timeWindow) * 60;
  }

  private updateAccuracy(): void {
    const totalCharacters = this.stats.charactersTyped + this.stats.errors;
    if (totalCharacters === 0) {
      this.stats.accuracy = 100;
      return;
    }
    
    this.stats.accuracy = (this.stats.charactersTyped / totalCharacters) * 100;
  }

  private updateScore(word: string, accuracy: number): void {
    // Base score from word length
    let wordScore = word.length * 10;
    
    // Accuracy bonus
    const accuracyMultiplier = accuracy / 100;
    wordScore *= accuracyMultiplier;
    
    // Speed bonus (higher WPM = higher multiplier)
    const speedMultiplier = Math.min(this.stats.wpm / 40, 2); // Cap at 2x for 40+ WPM
    wordScore *= (1 + speedMultiplier);
    
    // Combo bonus for consecutive perfect words
    const perfectWords = this.getConsecutivePerfectWords();
    if (perfectWords > 1) {
      wordScore *= (1 + (perfectWords - 1) * 0.1); // 10% bonus per consecutive perfect word
    }
    
    this.stats.score += Math.round(wordScore);
  }

  private getConsecutivePerfectWords(): number {
    let count = 0;
    for (let i = this.wordHistory.length - 1; i >= 0; i--) {
      if (this.wordHistory[i].accuracy === 100) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  public getCurrentStats(): GameStats {
    return { ...this.stats };
  }

  public getDetailedStats(): {
    stats: GameStats;
    recentWPM: number[];
    accuracyTrend: number[];
    wordHistory: Array<{ word: string; accuracy: number; timestamp: number }>;
  } {
    return {
      stats: this.getCurrentStats(),
      recentWPM: this.calculateRecentWPMTrend(),
      accuracyTrend: this.calculateAccuracyTrend(),
      wordHistory: [...this.wordHistory]
    };
  }

  private calculateRecentWPMTrend(): number[] {
    const trend: number[] = [];
    const intervals = 10; // Calculate WPM for last 10 intervals
    const intervalDuration = 6000; // 6 seconds per interval
    
    for (let i = 0; i < intervals; i++) {
      const endTime = Date.now() - (i * intervalDuration);
      const startTime = endTime - intervalDuration;
      
      const wordsInInterval = this.wordHistory.filter(
        w => w.timestamp >= startTime && w.timestamp < endTime
      ).length;
      
      const wpmForInterval = (wordsInInterval / intervalDuration) * 60000;
      trend.unshift(wpmForInterval);
    }
    
    return trend;
  }

  private calculateAccuracyTrend(): number[] {
    const trend: number[] = [];
    const windowSize = 5; // Calculate accuracy for last 5 words
    
    for (let i = Math.max(0, this.wordHistory.length - windowSize); i < this.wordHistory.length; i++) {
      const window = this.wordHistory.slice(Math.max(0, i - windowSize + 1), i + 1);
      const avgAccuracy = window.reduce((sum, w) => sum + w.accuracy, 0) / window.length;
      trend.push(avgAccuracy);
    }
    
    return trend;
  }

  private resetStats(): void {
    this.stats = {
      wpm: 0,
      accuracy: 100,
      score: 0,
      wordsCompleted: 0,
      charactersTyped: 0,
      errors: 0,
      timeElapsed: 0
    };
    this.wordHistory = [];
    this.recentWords = [];
  }

  private saveSessionData(stats: GameStats): void {
    try {
      const sessionData = {
        ...stats,
        timestamp: Date.now(),
        wordHistory: this.wordHistory
      };
      
      const existingSessions = JSON.parse(localStorage.getItem('typingGameSessions') || '[]');
      existingSessions.push(sessionData);
      
      // Keep only last 50 sessions
      if (existingSessions.length > 50) {
        existingSessions.splice(0, existingSessions.length - 50);
      }
      
      localStorage.setItem('typingGameSessions', JSON.stringify(existingSessions));
    } catch (error) {
      console.warn('Failed to save session data:', error);
    }
  }
}