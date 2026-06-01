# Regras adicionais de release.
# Mantidas enxutas para não mascarar problemas reais do shrinker.

# Preserva nomes de classes usados por reflection do Flutter e plugins.
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# Preserva serialização de modelos anotados/dinâmicos quando necessário.
-keepattributes Signature
-keepattributes RuntimeVisibleAnnotations
