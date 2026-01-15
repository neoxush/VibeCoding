#!/usr/bin/env python3
"""
Steam Trophy Hunter - Main Application
"""
import sys
import os
from PyQt6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget, QLabel
from PyQt6.QtCore import Qt

class SteamTrophyHunter(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Steam Trophy Hunter")
        self.setMinimumSize(1024, 768)
        
        # Initialize UI
        self.init_ui()
        
    def init_ui(self):
        """Initialize the main UI components"""
        # Create main widget and layout
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        layout = QVBoxLayout(main_widget)
        
        # Add welcome message
        welcome_label = QLabel("Welcome to Steam Trophy Hunter!")
        welcome_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        welcome_label.setStyleSheet("font-size: 24px; margin: 20px;")
        layout.addWidget(welcome_label)
        
        # Add status message
        status_label = QLabel("Please sign in with your Steam account to begin.")
        status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(status_label)

def main():
    """Main application entry point"""
    app = QApplication(sys.argv)
    
    # Set application style
    app.setStyle('Fusion')
    
    # Create and show main window
    window = SteamTrophyHunter()
    window.show()
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
