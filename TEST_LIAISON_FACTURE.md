# TEST DE LA LIAISON FACTURE - BUDGET PRÉVISIONNEL

## ⚠️ IMPORTANT - ÉTAPES OBLIGATOIRES

### 1. Vider COMPLÈTEMENT le cache du navigateur

**Chrome/Edge:**
1. Appuyez sur `F12` pour ouvrir les DevTools
2. Cliquez droit sur le bouton de rafraîchissement (à gauche de la barre d'adresse)
3. Sélectionnez "Vider le cache et effectuer une actualisation forcée"
4. OU : `Ctrl+Shift+Delete` → Cocher "Images et fichiers en cache" → Effacer

**Firefox:**
1. `Ctrl+Shift+Delete`
2. Cocher "Cache"
3. Cliquer sur "Effacer maintenant"

### 2. Fermer COMPLÈTEMENT le navigateur
- Fermez toutes les fenêtres et tous les onglets
- Rouvrez le navigateur
- Allez sur http://localhost:3000

### 3. Vérifier les logs dans la console

Ouvrez la console (`F12` → onglet Console) et vous devriez voir:

```
✅ BUTTON CLICKED - Lier button
🔗🔗🔗 LINK FORECAST FUNCTION CALLED 🔗🔗🔗
🔗 Invoice ID: cmig1dahv000jfm94us92aj8m
🔗 Forecast ID: xxx
🔗 Full URL: /api/invoices/cmig1dahv000jfm94us92aj8m/link-forecast
🔗 Sending fetch request...
🔗 Response received - status: 200
🔗 Success! Data: {...}
```

### 4. Vérifier les logs du serveur

Dans le terminal, vous devriez voir:

```
PUT /api/invoices/[id]/link-forecast 200 in XXms
```

**PAS:**
```
PUT /api/invoices/[id] 200 in XXms
```

## Corrections effectuées

1. **Texte blanc:** Ajout de `!text-white [&_[data-placeholder]]:!text-white` pour forcer le texte en blanc
2. **Fonction de liaison:** Ajout de `e.preventDefault()` et `e.stopPropagation()` pour empêcher toute propagation
3. **Logs de debug:** Ajout de logs très visibles avec 🔗🔗🔗 pour tracer l'exécution
4. **Click handler:** Ajout d'un log ✅ AVANT l'appel de la fonction pour vérifier que le bouton est cliqué

## Si ça ne fonctionne toujours pas

Le problème est le CACHE DU NAVIGATEUR. Vous DEVEZ:
1. Fermer le navigateur complètement
2. Supprimer manuellement le cache dans les paramètres du navigateur
3. Redémarrer le navigateur
4. Aller directement sur http://localhost:3000 (ne pas utiliser l'historique)
