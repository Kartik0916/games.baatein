import 'package:flutter/material.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(const BaateinGamesApp());
}

class BaateinGamesApp extends StatelessWidget {
  const BaateinGamesApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Baatein Games',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}
