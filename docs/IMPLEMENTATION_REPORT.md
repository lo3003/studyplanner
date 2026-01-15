# Study Planner - Rapport d'Implémentation MVP

**Date**: 15 Janvier 2026  
**Version**: MVP Phase 2 - Fixed Events, Conflicts, DnD, Locking

---

## 1. ARCHITECTURE ACTUELLE

### 1.1 Stack Technique
- **Framework**: Next.js 16+ (App Router)
- **Langage**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (Radix primitives)
- **Icons**: lucide-react
- **Notifications**: sonner
- **State Management**: Zustand v5
- **Calendrier**: react-big-calendar v1.19.4 (avec addon DnD)
- **Backend**: Supabase (Auth + Postgres + RLS)
- **Dates**: date-fns v4
- **Tests**: Vitest v3

### 1.2 Structure des Fichiers (Après implémentation)

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx                    # Dashboard principal (MODIFIÉ)
│   └── login/
│       └── page.tsx
├── components/
│   ├── features/
│   │   ├── CalendarView.tsx        # Avec DnD + légende (MODIFIÉ)
│   │   ├── FixedEventDialog.tsx    # NOUVEAU
│   │   └── TaskDialog.tsx
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── supabase.ts                 # Client Supabase de base
│   ├── supabase/
│   │   └── services.ts             # NOUVEAU - CRUD typé
│   ├── scheduler.ts                # NOUVEAU - Algorithme de génération
│   ├── __tests__/
│   │   └── scheduler.test.ts       # NOUVEAU - Tests unitaires
│   └── utils.ts
├── store/
│   └── plannerStore.ts             # NOUVEAU - Zustand store
└── types/
    └── index.ts                    # NOUVEAU - Types TypeScript
docs/
├── IMPLEMENTATION_REPORT.md        # Ce fichier
└── sql/
    └── migrations.sql              # NOUVEAU - Migrations DB
```

### 1.3 Base de Données

**Table: `tasks`** (existante)
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| title | text | Nom de la tâche |
| deadline | timestamptz | Date limite |
| estimated_hours | numeric | Heures de travail estimées |
| difficulty | int | 1-5 |
| importance | int | 1-5 |
| created_at | timestamptz | Auto |

**Table: `fixed_events`** (NOUVELLE)
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| title | text | Nom de l'événement |
| start_at | timestamptz | Début |
| end_at | timestamptz | Fin |
| description | text | Optionnel |
| color | text | Couleur (#6b7280 par défaut) |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

**Table: `schedule_blocks`** (NOUVELLE)
| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| task_id | uuid | FK → tasks |
| title | text | Dénormalisé |
| start_at | timestamptz | Début |
| end_at | timestamptz | Fin |
| duration_minutes | int | Durée en minutes |
| is_locked | boolean | Verrouillé (non modifiable par régénération) |
| color | text | Couleur (#3b82f6 par défaut) |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

---

## 2. FONCTIONNALITÉS IMPLÉMENTÉES

### ✅ B1: Fixed Events (Événements Fixes)
- CRUD complet (création, lecture, suppression)
- Affichage en gris sur le calendrier
- Non déplaçables par drag & drop
- Bloquent la génération automatique

### ✅ B2: Drag & Drop + Persistance + Verrouillage
- Addon `withDragAndDrop` de react-big-calendar activé
- Seuls les `schedule_blocks` sont déplaçables
- Au drop: mise à jour DB + `is_locked = true`
- Détection de collision avec:
  - Fixed events → toast d'erreur + revert
  - Locked blocks → toast d'erreur + revert

### ✅ B3: Gestion des Conflits (Scheduler)
- Suppression des blocs futurs NON verrouillés avant régénération
- Fixed events traités comme "murs"
- Locked blocks traités comme "murs"
- Génération uniquement dans créneaux libres
- Warnings si tâche non planifiable avant deadline

### ✅ B4: Services Supabase Centralisés
- `getFixedEvents(range?)` - Lecture avec filtre date optionnel
- `createFixedEvent(payload)` - Création
- `updateFixedEvent(id, payload)` - Mise à jour
- `deleteFixedEvent(id)` - Suppression
- `getScheduleBlocks(range?)` - Lecture
- `createScheduleBlocksBatch(inputs)` - Création en batch
- `updateScheduleBlock(id, payload)` - Pour DnD
- `deleteFutureUnlockedBlocks()` - Pour régénération
- `getLockedBlocks(range?)` - Pour scheduler

### ✅ B5: Zustand Store
- State: `tasks`, `fixedEvents`, `scheduleBlocks`, `isLoading`, `isGenerating`
- Actions: `fetchAll`, `addFixedEvent`, `updateScheduleBlock`, `generateSchedule`
- Selectors pour optimisation des rerenders

### ✅ B6: Tests Unitaires
- Framework: Vitest v3
- Tests pour:
  - `doTimeRangesOverlap` - Détection de chevauchement
  - `checkCollision` - Collision avec fixed/locked
  - `generateScheduleBlocks` - Algorithme principal
  - `findFreeSlots` - Découpage des créneaux

### ✅ B7: UX & Détails
- Légende visuelle sur le calendrier
- Blocs verrouillés avec bordure jaune + emoji 🔐
- Fixed events avec emoji 🔒
- Deadlines avec emoji 📅
- Toasts informatifs pour toutes les actions

---

## 3. COMMENT TESTER

### 3.1 Prérequis

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer .env.local
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# 3. Exécuter les migrations SQL dans Supabase Dashboard
# (Copier le contenu de /docs/sql/migrations.sql)

# 4. Lancer le serveur de dev
npm run dev
```

### 3.2 Tests Manuels

**Scénario 1: Fixed Events**
1. Se connecter
2. Cliquer "Ajouter un événement fixe"
3. Remplir: "Cours de Maths", demain 10:00-12:00
4. Valider → L'événement apparaît en gris
5. Essayer de le déplacer → Impossible

**Scénario 2: Génération de Planning**
1. Créer une tâche avec deadline dans 7 jours, 4h estimées
2. Cliquer "Générer le planning"
3. Vérifier que des blocs bleus apparaissent
4. Vérifier qu'aucun bloc ne chevauche le fixed event

**Scénario 3: Drag & Drop**
1. Déplacer un bloc bleu vers un créneau libre → Succès + toast
2. Vérifier la bordure jaune (verrouillé)
3. Déplacer le même bloc sur le fixed event → Erreur + revert
4. Régénérer → Le bloc verrouillé reste en place

**Scénario 4: Warning Deadline**
1. Créer une tâche avec deadline dans 1h et 10h estimées
2. Générer → Warning "Impossible de planifier..."

### 3.3 Tests Automatisés

```bash
# Lancer tous les tests
npm run test

# Lancer une seule fois
npm run test:run

# Avec coverage
npm run test:coverage
```

---

## 4. EDGE CASES CONNUS

| Cas | Comportement |
|-----|--------------|
| Fixed event sur deadline | Deadline reste affichée, fixed event bloque |
| Drop sur locked block | Revert + toast erreur |
| Tâche 0h estimées | Ignorée par scheduler |
| Deadline passée | Tâche non planifiée |
| Timezone différente | Dates en UTC, affichage local |
| Aucune tâche | Bouton "Générer" désactivé |

---

## 5. POINTS D'AMÉLIORATION FUTURS

1. **Édition des fixed events** (modal d'édition, pas juste suppression)
2. **Récurrence des fixed events** (cours hebdomadaires)
3. **Préférences utilisateur** (heures de travail, durée max bloc)
4. **Mode sombre**
5. **Export iCal**
6. **Notifications push avant deadline**

---

## 6. CHANGELOG

### v0.2.0 (15/01/2026)
- ✅ Table `fixed_events` avec RLS
- ✅ Table `schedule_blocks` avec RLS  
- ✅ Types TypeScript stricts
- ✅ Services Supabase centralisés
- ✅ Store Zustand complet
- ✅ Scheduler algorithm v1
- ✅ FixedEventDialog component
- ✅ CalendarView avec DnD
- ✅ Gestion des collisions
- ✅ Verrouillage des blocs
- ✅ Légende visuelle
- ✅ Tests unitaires scheduler (Vitest)

### v0.1.0 (Initial)
- Dashboard basique
- CRUD tasks
- Calendrier lecture seule
- Auth Supabase

---

*Rapport d'implémentation - Study Planner MVP Phase 2*
