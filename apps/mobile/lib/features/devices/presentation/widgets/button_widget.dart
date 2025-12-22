import 'package:flutter/material.dart';

/// Button Widget - One-shot action button for write-only controls
class ButtonControlWidget extends StatefulWidget {
  final String label;
  final IconData? icon;
  final Color? color;
  final bool isLoading;
  final VoidCallback onPressed;

  const ButtonControlWidget({
    super.key,
    required this.label,
    this.icon,
    this.color,
    this.isLoading = false,
    required this.onPressed,
  });

  @override
  State<ButtonControlWidget> createState() => _ButtonControlWidgetState();
}

class _ButtonControlWidgetState extends State<ButtonControlWidget> {
  bool _isPending = false;

  void _handlePress() {
    if (_isPending || widget.isLoading) return;
    
    setState(() {
      _isPending = true;
    });
    
    widget.onPressed();
    
    // Reset pending state after a delay
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _isPending = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final displayColor = widget.color ?? theme.colorScheme.primary;
    final isLoading = widget.isLoading || _isPending;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: isLoading ? null : _handlePress,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          decoration: BoxDecoration(
            color: displayColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: displayColor.withOpacity(0.3),
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (isLoading) ...[
                SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: displayColor,
                  ),
                ),
              ] else if (widget.icon != null) ...[
                Icon(
                  widget.icon,
                  size: 18,
                  color: displayColor,
                ),
              ],
              const SizedBox(width: 8),
              Text(
                widget.label,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: displayColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
