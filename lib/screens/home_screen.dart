import 'package:flutter/material.dart';
import 'game_webview_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String? _lastGameResult;

  Future<void> _startTwoPlayerGame() async {
    final result = await Navigator.push<String>(
      context,
      MaterialPageRoute(
        builder: (context) => const GameWebViewScreen(),
      ),
    );

    if (result != null && mounted) {
      setState(() {
        _lastGameResult = result;
      });
      
      String message;
      switch (result) {
        case 'win':
          message = 'Congratulations! You won the game!';
          break;
        case 'loss':
          message = 'Better luck next time!';
          break;
        case 'draw':
          message = 'The game ended in a draw!';
          break;
        default:
          message = 'Game completed!';
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Baatein Games'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.games,
                size: 80,
                color: Colors.deepPurple,
              ),
              const SizedBox(height: 24),
              const Text(
                'Welcome to Baatein Games',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Play Tic Tac Toe with friends in real-time',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              ElevatedButton.icon(
                onPressed: _startTwoPlayerGame,
                icon: const Icon(Icons.play_arrow),
                label: const Text('Start 2-Player Game'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 16,
                  ),
                  textStyle: const TextStyle(fontSize: 18),
                ),
              ),
              const SizedBox(height: 24),
              if (_lastGameResult != null) ...[
                const Divider(),
                const SizedBox(height: 16),
                Text(
                  'Last Game Result: ${_lastGameResult!.toUpperCase()}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
