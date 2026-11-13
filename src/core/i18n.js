// All the words of the game, in French and English.
import { save } from './save.js';

const FR = {
  'app.sub': 'Les Pentes du Temps',
  'boot.tap': 'Toucher pour commencer',
  'boot.loading': 'Remontage des horloges…',
  'common.back': 'Retour', 'common.ok': 'OK', 'common.yes': 'Oui', 'common.no': 'Non', 'common.cancel': 'Annuler',
  'common.play': 'Jouer', 'common.close': 'Fermer', 'common.locked': 'Verrouillé', 'common.new': 'Nouveau',
  'common.m': 'm', 'common.kmh': 'km/h', 'common.level': 'Niveau {n}',

  // menu
  'menu.play': 'Descente infinie', 'menu.play.sub': 'Glisse, enchaîne, traverse les époques',
  'menu.story': 'Histoire', 'menu.multi': 'Multijoueur', 'menu.shop': 'Boutique', 'menu.missions': 'Missions',
  'menu.records': 'Records', 'menu.options': 'Options', 'menu.install': 'Installer',
  'menu.daily': 'Cadeau du jour', 'menu.daily.txt': 'Jour {n} — voici {c} éclats. Reviens demain !', 'menu.daily.get': 'Merci !',
  'menu.best': 'Record', 'menu.update': 'Nouvelle version disponible', 'menu.update.do': 'Recharger',
  'menu.offline': 'Prêt à jouer hors ligne',

  // pre-run
  'ready.title': 'Prêt·e ?', 'ready.go': "C'est parti !", 'ready.head': 'Départ éclair', 'ready.head.sub': 'Démarre en mode Fulgur',
  'ready.missions': 'Missions en cours', 'ready.none': 'Aucun en stock',

  // hud
  'hud.fulgur': 'FULGUR', 'hud.combo': 'BACK2BACK', 'hud.storm': 'Tempête', 'hud.pos': 'Position',
  'hud.banked': 'Enchaînement ×{m}', 'hud.go': 'GO !', 'hud.crash.rock': 'Aïe !', 'hud.crash.bail': 'Mauvaise réception…',
  'hud.crash.fall': 'Dans le vide !', 'hud.crash.wall': 'Trop court !', 'hud.crash.storm': 'Rattrapé·e par la tempête !',
  'hud.jump': 'Saut temporel', 'hud.mult': 'Score ×{m}',

  'trick.flip1': 'Salto arrière', 'trick.flip2': 'Double salto', 'trick.flip3': 'Triple salto !', 'trick.perfect': 'Réception parfaite',
  'trick.grind': 'Glissade {n} m', 'trick.gap': 'Gouffre franchi', 'trick.hop': 'Par-dessus !', 'trick.smash': 'Pulvérisé',
  'trick.stomp': 'Écrasé !', 'trick.bigair': 'Grand saut',

  'power.magnet': 'Aimant', 'power.shield': 'Bouclier', 'power.double': 'Éclats ×2', 'power.charge': 'Charge Fulgur',
  'toast.fulgur': 'MODE FULGUR !', 'toast.shield': 'Bouclier brisé', 'toast.mission': 'Mission accomplie',
  'toast.copied': 'Code copié', 'toast.saved': 'Enregistré', 'toast.bought': 'Acheté !', 'toast.equipped': 'Équipé',
  'toast.poor': "Pas assez d'éclats", 'toast.installed': 'Installé',

  'tut.jump': 'Touche pour sauter', 'tut.flip': 'Maintiens en l\'air pour un salto… et relâche avant d\'atterrir',
  'tut.rail': 'Saute sur le rail pour glisser',

  // pause / revive / results
  'pause.title': 'Pause', 'pause.resume': 'Reprendre', 'pause.restart': 'Recommencer', 'pause.quit': 'Quitter',
  'revive.title': 'Seconde chance ?', 'revive.use': 'Utiliser ({n})', 'revive.no': 'Non merci',
  'res.title': 'Fin de la descente', 'res.new': 'Nouveau record !', 'res.score': 'Score', 'res.dist': 'Distance', 'res.coins': 'Éclats',
  'res.flips': 'Saltos', 'res.combo': 'Meilleur enchaînement', 'res.jumps': 'Sauts temporels', 'res.speed': 'Vitesse max',
  'res.again': 'Rejouer', 'res.menu': 'Menu', 'res.shop': 'Boutique', 'res.missions': 'Missions', 'res.levelup': 'Rang supérieur !',
  'res.reward': '+{n} éclats', 'res.rank': 'Classement local : n°{n}',
  'res.chapter': 'Chapitre terminé', 'res.chapter.fail': 'Le Rouage t\'échappe…', 'res.continue': 'Continuer', 'res.retry': 'Réessayer',
  'res.race.win': 'Victoire !', 'res.race.place': '{n}e place', 'res.race.title': 'Arrivée', 'res.rematch': 'Revanche',
  'res.dnf': 'en course',

  // missions
  'mis.title': 'Missions', 'mis.info': 'Accomplis les trois missions pour monter en rang et gagner {n} éclats.',
  'mis.dist': 'Parcourir {n} m en une descente', 'mis.distT': 'Parcourir {n} m au total',
  'mis.flips': 'Réussir {n} saltos en une descente', 'mis.flipsT': 'Réussir {n} saltos au total',
  'mis.double': 'Réussir {n} double(s) salto(s) en une descente', 'mis.coins': 'Ramasser {n} éclats en une descente',
  'mis.coinsT': 'Ramasser {n} éclats au total', 'mis.grind': 'Glisser {n} m sur des rails en une descente',
  'mis.grindT': 'Glisser {n} m sur des rails au total', 'mis.gaps': 'Franchir {n} gouffres en une descente',
  'mis.hops': 'Sauter par-dessus {n} obstacles en une descente', 'mis.smash': 'Pulvériser {n} obstacles au total',
  'mis.combo': 'Enchaîner {n} figures back-to-back', 'mis.score': 'Marquer {n} points en une descente',
  'mis.jumps': 'Faire {n} saut(s) temporel(s) en une descente', 'mis.speed': 'Atteindre {n} km/h',
  'mis.fulgur': 'Déclencher {n} fois le mode Fulgur', 'mis.perfect': 'Réussir {n} réceptions parfaites',
  'rank.0': 'Apprenti·e', 'rank.1': 'Glisseur·se', 'rank.2': 'Voltigeur·se', 'rank.3': 'Chrononaute', 'rank.4': 'Maître-horloger',
  'rank.5': 'Gardien·ne du Temps', 'rank.6': 'Légende de Méridien',

  // records
  'rec.title': 'Records', 'rec.best': 'Meilleur score', 'rec.bestDist': 'Plus longue descente', 'rec.runs': 'Descentes',
  'rec.total': 'Distance totale', 'rec.flips': 'Saltos réussis', 'rec.bestFlip': 'Plus beau salto', 'rec.combo': 'Meilleur enchaînement',
  'rec.grind': 'Rails glissés', 'rec.jumps': 'Sauts temporels', 'rec.eras': 'Époques visitées', 'rec.time': 'Temps de jeu',
  'rec.races': 'Courses', 'rec.wins': 'Victoires', 'rec.top': 'Top 10 local', 'rec.empty': 'Aucune descente enregistrée. À toi de jouer !',
  'rec.km': '{n} km', 'rec.min': '{n} min',

  // shop
  'shop.title': 'Boutique', 'shop.riders': 'Glisseurs', 'shop.boards': 'Planches', 'shop.upgrades': 'Atelier', 'shop.items': 'Bonus',
  'shop.buy': 'Acheter', 'shop.equip': 'Équiper', 'shop.equipped': 'Équipé', 'shop.story': "Termine l'histoire", 'shop.max': 'Max',
  'shop.owned': 'En stock : {n}', 'shop.lvl': 'Niv. {n}',
  'stat.jump': 'Saut', 'stat.flip': 'Rotation', 'stat.speed': 'Vitesse', 'stat.boost': 'Boost',
  'rider.nova': 'Nova', 'rider.nova.d': 'Apprentie horlogère, seize ans, et déjà en retard. Équilibrée en tout.',
  'rider.tobias': 'Tobias', 'rider.tobias.d': 'Le meilleur ami. Lourd, rapide, et il le sait.',
  'rider.ada': 'Prof. Ada Cadran', 'rider.ada.d': 'Inventrice de la Fulgur. Ses propulseurs maison sautent très haut.',
  'rider.rouage': 'Rouage', 'rider.rouage.d': 'Petit automate de laiton. Tourne sur lui-même comme une toupie.',
  'rider.elea': 'Capitaine Éléa', 'rider.elea.d': 'Pilote temporelle de 2187. Précise, vive, redoutable.',
  'rider.baron': 'Le Baron Sablier', 'rider.baron.d': 'Il voulait arrêter le temps. Il a fini par apprendre à glisser dessus.',
  'board.mk1': 'Fulgur Mk I', 'board.mk1.d': 'Bois, laiton, éclair en bouteille. Le prototype d\'Ada.',
  'board.eclair': 'Éclair', 'board.eclair.d': 'Les boosts durent 25 % plus longtemps.',
  'board.fossile': 'Fossile', 'board.fossile.d': 'Taillée dans un os de géant. Saute plus haut.',
  'board.neon86': 'Néon 86', 'board.neon86.d': 'Tourne plus vite. Laisse une traînée rose bonbon.',
  'board.helix': 'Hélix 2187', 'board.helix.d': 'Sustentation magnétique : plus rapide, plus aérienne.',
  'board.paradoxe': 'Paradoxe', 'board.paradoxe.d': 'Forgée à la fin des temps. Meilleure partout.',
  'up.fulgur': 'Condensateur', 'up.fulgur.d': 'Le mode Fulgur dure {n} s',
  'up.magnet': 'Aimant', 'up.magnet.d': 'L\'aimant dure {n} s',
  'up.shield': 'Bouclier', 'up.shield.d': 'Pare un choc — récupération {n} s',
  'up.double': 'Doubleur', 'up.double.d': 'Les éclats ×2 durent {n} s',
  'item.headstart': 'Départ éclair', 'item.headstart.d': 'Commence la descente en mode Fulgur.',
  'item.revive': 'Seconde chance', 'item.revive.d': 'Repars après une chute, une fois par descente.',

  // options
  'opt.title': 'Options', 'opt.music': 'Musique', 'opt.sfx': 'Effets', 'opt.quality': 'Qualité graphique',
  'opt.q.auto': 'Auto', 'opt.q.low': 'Basse', 'opt.q.medium': 'Moyenne', 'opt.q.high': 'Haute',
  'opt.haptics': 'Vibrations', 'opt.shake': 'Tremblements de caméra', 'opt.fps': 'Afficher les images/s', 'opt.lang': 'Langue',
  'opt.name': 'Pseudo', 'opt.how': 'Comment jouer', 'opt.credits': 'Crédits', 'opt.reset': 'Réinitialiser la progression',
  'opt.reset.q': 'Effacer toute la progression (éclats, achats, records) ?', 'opt.fullscreen': 'Plein écran',
  'opt.install': "Installer l'application", 'opt.reload': 'Le changement de qualité s\'applique au prochain lancement.',

  'how.title': 'Comment jouer',
  'how.1': 'Touche l\'écran (ou Espace) pour sauter.', 'how.2': 'Maintiens en l\'air pour tourner en arrière. Relâche pour te redresser avant d\'atterrir.',
  'how.3': 'Chaque figure réussie donne un boost et charge la Fulgur. Enchaîne-les back-to-back pour multiplier les points.',
  'how.4': 'Atterris sur les rails pour glisser. Saute par-dessus les obstacles et les gouffres.',
  'how.5': 'Jauge pleine : MODE FULGUR. Vitesse folle, invincible, aimant à éclats.',
  'how.6': 'Traverse les portails pour changer d\'époque : chaque saut temporel augmente ton multiplicateur.',

  'cred.title': 'Crédits',
  'cred.txt': 'BACK2BACK — Les Pentes du Temps\n\nUn hommage aux grandes aventures de voyage dans le temps.\n\nTout est généré par le code : décors, personnages, effets, musiques et bruitages. Aucun fichier image ni son.\n\nMoteur 3D : Three.js (licence MIT)\nAudio : Web Audio API\nMultijoueur : WebSocket\n\nAucune donnée collectée : pas de compte, pas de publicité, pas de suivi. Ta progression reste sur ton appareil.',

  // story
  'story.title': 'Histoire', 'story.prologue': 'Prologue', 'story.prologue.t': 'Minuit moins une',
  'story.watch': 'Revoir', 'story.goal': 'Récupère le Rouage au bout de la pente ({n} m)',
  'story.ch': 'Chapitre {n}', 'story.best': 'Meilleur score : {n}', 'story.done': 'Histoire terminée — le Baron et la planche Paradoxe sont débloqués !',
  'story.reward': 'Récompense : {n} éclats',
  'era.present': 'Mont Méridien', 'era.present.y': "Aujourd'hui",
  'era.jurassic': "L'Ère des Géants", 'era.jurassic.y': '−66 000 000',
  'era.west': 'Le Grand Ouest', 'era.west.y': '1874',
  'era.chrome': "L'Âge du Chrome", 'era.chrome.y': '1957',
  'era.neon': 'Nuits Néon', 'era.neon.y': '1986',
  'era.future': 'Néo-Méridien', 'era.future.y': '2187',
  'era.void': 'La Fin des Temps', 'era.void.y': '∞',
  'cog.1': 'Rouage de Pierre', 'cog.2': 'Rouage de Cuivre', 'cog.3': 'Rouage de Chrome', 'cog.4': 'Rouage de Néon',
  'cog.5': 'Rouage de Lumière', 'cog.6': "L'Aiguille de Minuit",
  'ch.1': 'Tout commence là où rien n\'avait encore d\'heure.', 'ch.2': 'Un rouage, une diligence et beaucoup de poussière.',
  'ch.3': 'Chrome rutilant, milk-shakes et soucoupes volantes.', 'ch.4': 'La ville ne dort jamais, le néon non plus.',
  'ch.5': 'Demain est blanc, propre… et très surveillé.', 'ch.6': 'La tempête avale tout. Ne ralentis pas.',

  // cinematics
  'cine.skip': 'Passer', 'cine.hold': 'Maintenir pour passer',
  'who.nova': 'Nova', 'who.ada': 'Ada', 'who.baron': 'Le Baron', 'who.tic': 'Tic', 'who.narr': '',
  'c.p.card': 'Mont Méridien. Minuit moins une.',
  'c.p.n1': 'Depuis toujours, la Grande Horloge de Méridien règle le cours du temps.',
  'c.p.n2': 'Cette nuit-là, quelqu\'un a décidé de l\'arrêter.',
  'c.p.b1': 'Le temps a assez couru. Désormais… il m\'appartient !',
  'c.p.a1': 'Nova ! Les cinq Rouages ont été projetés à travers les époques !',
  'c.p.a2': 'Sans eux, hier, aujourd\'hui et demain vont se détendre comme un vieux ressort.',
  'c.p.v1': 'Alors je vais les chercher. Un par un.',
  'c.p.a3': 'Prends la Fulgur. Elle glisse sur les pentes du temps.',
  'c.p.a4': 'Enchaîne les figures, dos à dos, sans souffler : c\'est ce qui la charge.',
  'c.p.t1': 'Hou-hou ! Tic… tac !',
  'c.p.v2': 'Chaque seconde compte.',
  'c.1.v1': 'Le Rouage de Pierre ! Il est encore tiède…', 'c.1.t1': 'Hou ?',
  'c.1.v2': 'Oui, Tic. On file avant que sa maman ne rentre.', 'c.1.b1': 'Une gamine sur une planche… Amusant.',
  'c.2.v1': 'Le Rouage de Cuivre. Il servait de roue à une diligence !',
  'c.2.b1': 'Tu ramasses mes miettes, petite. Le temps, lui, est déjà à moi.', 'c.2.v2': 'On verra bien qui arrive à l\'heure.',
  'c.3.v1': 'Le Rouage de Chrome ! Coincé dans un juke-box…',
  'c.3.a1': 'Bien joué, ma grande ! Plus que deux. Mais attention : le Baron accélère les horloges.', 'c.3.t1': 'Tic-tic-tic-tic !',
  'c.4.v1': 'Le Rouage de Néon. Il brillait plus fort que toute la ville.',
  'c.4.b1': 'Assez joué. Rendez-vous à la fin des temps.', 'c.4.v2': 'J\'y serai. En avance, même.',
  'c.5.v1': 'Le Rouage de Lumière ! Il ne manque plus que l\'Aiguille.',
  'c.5.a1': 'Nova… il l\'a emportée là où les horloges vont mourir.', 'c.5.v2': 'La fin des temps. Alors on y va.',
  'c.6.b1': 'Regarde, petite ! Plus d\'avant, plus d\'après. Un instant parfait… pour toujours.',
  'c.6.v1': 'Un instant qui ne passe pas, ce n\'est pas la perfection. C\'est une cage.',
  'c.6.v2': 'Fulgur… à fond !',
  'c.6.n1': 'Minuit sonna. Puis minuit une.',
  'c.6.a1': 'Juste à l\'heure, ma grande.', 'c.6.v3': 'À l\'heure… et prête pour le prochain tour.',
  'c.6.end': 'FIN', 'c.6.thanks': 'Merci d\'avoir joué.',

  // multiplayer
  'mp.title': 'Multijoueur', 'mp.quick': 'Partie rapide', 'mp.quick.sub': 'Rejoins une course ouverte',
  'mp.create': 'Créer un salon', 'mp.create.sub': 'Invite tes amis avec un code',
  'mp.join': 'Rejoindre', 'mp.code': 'Code du salon', 'mp.ai': 'Course contre l\'IA', 'mp.ai.sub': 'Hors ligne, jusqu\'à 3 rivaux',
  'mp.connecting': 'Connexion au serveur…', 'mp.offline': 'Serveur injoignable. La course contre l\'IA reste disponible.',
  'mp.online': 'En ligne', 'mp.room': 'Salon', 'mp.players': 'Joueurs', 'mp.ready': 'Prêt·e', 'mp.notready': 'Pas prêt·e',
  'mp.start': 'Lancer la course', 'mp.wait': 'En attente de l\'hôte…', 'mp.host': 'Hôte', 'mp.you': 'toi', 'mp.leave': 'Quitter le salon',
  'mp.share': 'Inviter', 'mp.share.txt': 'Rejoins ma course sur BACK2BACK ! Code : {code}', 'mp.length': 'Longueur', 'mp.era': 'Époque',
  'mp.random': 'Aléatoire', 'mp.rivals': 'Rivaux', 'mp.err.full': 'Ce salon est complet.', 'mp.err.none': 'Salon introuvable.',
  'mp.err.started': 'La course a déjà commencé.', 'mp.err.lost': 'Connexion perdue.', 'mp.public': 'Salon public',
  'mp.server': 'Adresse du serveur (optionnel)', 'mp.server.ph': 'wss://mon-serveur.example', 'mp.waiting': 'En attente des autres riders…',
  'mp.go': 'La course démarre !', 'mp.left': '{name} a quitté la course', 'mp.joined': '{name} a rejoint le salon',
  'mp.bot': 'IA',
};

const EN = {
  'app.sub': 'Slopes of Time',
  'boot.tap': 'Tap to start',
  'boot.loading': 'Winding the clocks…',
  'common.back': 'Back', 'common.ok': 'OK', 'common.yes': 'Yes', 'common.no': 'No', 'common.cancel': 'Cancel',
  'common.play': 'Play', 'common.close': 'Close', 'common.locked': 'Locked', 'common.new': 'New',
  'common.m': 'm', 'common.kmh': 'km/h', 'common.level': 'Level {n}',

  'menu.play': 'Endless descent', 'menu.play.sub': 'Ride, chain tricks, cross the ages',
  'menu.story': 'Story', 'menu.multi': 'Multiplayer', 'menu.shop': 'Shop', 'menu.missions': 'Missions',
  'menu.records': 'Records', 'menu.options': 'Options', 'menu.install': 'Install',
  'menu.daily': 'Daily gift', 'menu.daily.txt': 'Day {n} — here are {c} shards. Come back tomorrow!', 'menu.daily.get': 'Thanks!',
  'menu.best': 'Best', 'menu.update': 'A new version is available', 'menu.update.do': 'Reload',
  'menu.offline': 'Ready to play offline',

  'ready.title': 'Ready?', 'ready.go': "Let's go!", 'ready.head': 'Lightning start', 'ready.head.sub': 'Begin in Fulgur mode',
  'ready.missions': 'Current missions', 'ready.none': 'None in stock',

  'hud.fulgur': 'FULGUR', 'hud.combo': 'BACK2BACK', 'hud.storm': 'Storm', 'hud.pos': 'Position',
  'hud.banked': 'Chain ×{m}', 'hud.go': 'GO!', 'hud.crash.rock': 'Ouch!', 'hud.crash.bail': 'Bad landing…',
  'hud.crash.fall': 'Into the void!', 'hud.crash.wall': 'Too short!', 'hud.crash.storm': 'Caught by the storm!',
  'hud.jump': 'Time jump', 'hud.mult': 'Score ×{m}',

  'trick.flip1': 'Backflip', 'trick.flip2': 'Double backflip', 'trick.flip3': 'Triple backflip!', 'trick.perfect': 'Perfect landing',
  'trick.grind': 'Grind {n} m', 'trick.gap': 'Chasm cleared', 'trick.hop': 'Over it!', 'trick.smash': 'Smashed',
  'trick.stomp': 'Stomped!', 'trick.bigair': 'Big air',

  'power.magnet': 'Magnet', 'power.shield': 'Shield', 'power.double': 'Shards ×2', 'power.charge': 'Fulgur charge',
  'toast.fulgur': 'FULGUR MODE!', 'toast.shield': 'Shield broken', 'toast.mission': 'Mission complete',
  'toast.copied': 'Code copied', 'toast.saved': 'Saved', 'toast.bought': 'Purchased!', 'toast.equipped': 'Equipped',
  'toast.poor': 'Not enough shards', 'toast.installed': 'Installed',

  'tut.jump': 'Tap to jump', 'tut.flip': 'Hold in the air to backflip… and release before landing',
  'tut.rail': 'Jump onto the rail to grind',

  'pause.title': 'Paused', 'pause.resume': 'Resume', 'pause.restart': 'Restart', 'pause.quit': 'Quit',
  'revive.title': 'Second chance?', 'revive.use': 'Use ({n})', 'revive.no': 'No thanks',
  'res.title': 'Run over', 'res.new': 'New record!', 'res.score': 'Score', 'res.dist': 'Distance', 'res.coins': 'Shards',
  'res.flips': 'Backflips', 'res.combo': 'Best chain', 'res.jumps': 'Time jumps', 'res.speed': 'Top speed',
  'res.again': 'Play again', 'res.menu': 'Menu', 'res.shop': 'Shop', 'res.missions': 'Missions', 'res.levelup': 'Rank up!',
  'res.reward': '+{n} shards', 'res.rank': 'Local ranking: #{n}',
  'res.chapter': 'Chapter complete', 'res.chapter.fail': 'The Cog slips away…', 'res.continue': 'Continue', 'res.retry': 'Try again',
  'res.race.win': 'Victory!', 'res.race.place': 'Place #{n}', 'res.race.title': 'Finish', 'res.rematch': 'Rematch',
  'res.dnf': 'racing',

  'mis.title': 'Missions', 'mis.info': 'Complete all three missions to rank up and earn {n} shards.',
  'mis.dist': 'Travel {n} m in one run', 'mis.distT': 'Travel {n} m in total',
  'mis.flips': 'Land {n} backflips in one run', 'mis.flipsT': 'Land {n} backflips in total',
  'mis.double': 'Land {n} double backflip(s) in one run', 'mis.coins': 'Collect {n} shards in one run',
  'mis.coinsT': 'Collect {n} shards in total', 'mis.grind': 'Grind {n} m of rails in one run',
  'mis.grindT': 'Grind {n} m of rails in total', 'mis.gaps': 'Clear {n} chasms in one run',
  'mis.hops': 'Jump over {n} obstacles in one run', 'mis.smash': 'Smash {n} obstacles in total',
  'mis.combo': 'Chain {n} tricks back-to-back', 'mis.score': 'Score {n} points in one run',
  'mis.jumps': 'Make {n} time jump(s) in one run', 'mis.speed': 'Reach {n} km/h',
  'mis.fulgur': 'Trigger Fulgur mode {n} times', 'mis.perfect': 'Land {n} perfect landings',
  'rank.0': 'Apprentice', 'rank.1': 'Rider', 'rank.2': 'Acrobat', 'rank.3': 'Chrononaut', 'rank.4': 'Master Clockmaker',
  'rank.5': 'Keeper of Time', 'rank.6': 'Legend of Meridian',

  'rec.title': 'Records', 'rec.best': 'Best score', 'rec.bestDist': 'Longest run', 'rec.runs': 'Runs',
  'rec.total': 'Total distance', 'rec.flips': 'Backflips landed', 'rec.bestFlip': 'Best flip', 'rec.combo': 'Best chain',
  'rec.grind': 'Rails ground', 'rec.jumps': 'Time jumps', 'rec.eras': 'Eras visited', 'rec.time': 'Play time',
  'rec.races': 'Races', 'rec.wins': 'Wins', 'rec.top': 'Local top 10', 'rec.empty': 'No run recorded yet. Your turn!',
  'rec.km': '{n} km', 'rec.min': '{n} min',

  'shop.title': 'Shop', 'shop.riders': 'Riders', 'shop.boards': 'Boards', 'shop.upgrades': 'Workshop', 'shop.items': 'Boosts',
  'shop.buy': 'Buy', 'shop.equip': 'Equip', 'shop.equipped': 'Equipped', 'shop.story': 'Finish the story', 'shop.max': 'Max',
  'shop.owned': 'In stock: {n}', 'shop.lvl': 'Lv. {n}',
  'stat.jump': 'Jump', 'stat.flip': 'Spin', 'stat.speed': 'Speed', 'stat.boost': 'Boost',
  'rider.nova': 'Nova', 'rider.nova.d': 'Apprentice clockmaker, sixteen, already late. Balanced all round.',
  'rider.tobias': 'Tobias', 'rider.tobias.d': 'The best friend. Heavy, fast, and he knows it.',
  'rider.ada': 'Prof. Ada Cadran', 'rider.ada.d': 'Inventor of the Fulgur. Her home-made thrusters jump very high.',
  'rider.rouage': 'Rouage', 'rider.rouage.d': 'A little brass automaton. Spins like a top.',
  'rider.elea': 'Captain Éléa', 'rider.elea.d': 'Time pilot from 2187. Precise, quick, formidable.',
  'rider.baron': 'Baron Sablier', 'rider.baron.d': 'He wanted to stop time. He ended up learning to ride it.',
  'board.mk1': 'Fulgur Mk I', 'board.mk1.d': "Wood, brass, bottled lightning. Ada's prototype.",
  'board.eclair': 'Éclair', 'board.eclair.d': 'Boosts last 25% longer.',
  'board.fossile': 'Fossil', 'board.fossile.d': "Carved from a giant's bone. Jumps higher.",
  'board.neon86': 'Neon 86', 'board.neon86.d': 'Spins faster. Leaves a candy-pink trail.',
  'board.helix': 'Helix 2187', 'board.helix.d': 'Magnetic lift: faster and more airborne.',
  'board.paradoxe': 'Paradox', 'board.paradoxe.d': 'Forged at the end of time. Better at everything.',
  'up.fulgur': 'Capacitor', 'up.fulgur.d': 'Fulgur mode lasts {n} s',
  'up.magnet': 'Magnet', 'up.magnet.d': 'The magnet lasts {n} s',
  'up.shield': 'Shield', 'up.shield.d': 'Absorbs one hit — recovery {n} s',
  'up.double': 'Doubler', 'up.double.d': 'Shards ×2 lasts {n} s',
  'item.headstart': 'Lightning start', 'item.headstart.d': 'Begin the run in Fulgur mode.',
  'item.revive': 'Second chance', 'item.revive.d': 'Get back up after a crash, once per run.',

  'opt.title': 'Options', 'opt.music': 'Music', 'opt.sfx': 'Effects', 'opt.quality': 'Graphics quality',
  'opt.q.auto': 'Auto', 'opt.q.low': 'Low', 'opt.q.medium': 'Medium', 'opt.q.high': 'High',
  'opt.haptics': 'Vibration', 'opt.shake': 'Camera shake', 'opt.fps': 'Show frames/s', 'opt.lang': 'Language',
  'opt.name': 'Nickname', 'opt.how': 'How to play', 'opt.credits': 'Credits', 'opt.reset': 'Reset progress',
  'opt.reset.q': 'Erase all progress (shards, purchases, records)?', 'opt.fullscreen': 'Full screen',
  'opt.install': 'Install the app', 'opt.reload': 'The quality change applies on next launch.',

  'how.title': 'How to play',
  'how.1': 'Tap the screen (or Space) to jump.', 'how.2': 'Hold in the air to spin backwards. Release to level out before landing.',
  'how.3': 'Every landed trick gives a boost and charges the Fulgur. Chain them back-to-back to multiply points.',
  'how.4': 'Land on rails to grind. Jump over obstacles and chasms.',
  'how.5': 'Gauge full: FULGUR MODE. Crazy speed, invincible, shard magnet.',
  'how.6': 'Go through portals to change era: every time jump raises your multiplier.',

  'cred.title': 'Credits',
  'cred.txt': 'BACK2BACK — Slopes of Time\n\nA tribute to the great time-travel adventures.\n\nEverything is generated by code: scenery, characters, effects, music and sounds. No image or audio files.\n\n3D engine: Three.js (MIT licence)\nAudio: Web Audio API\nMultiplayer: WebSocket\n\nNo data collected: no account, no ads, no tracking. Your progress stays on your device.',

  'story.title': 'Story', 'story.prologue': 'Prologue', 'story.prologue.t': 'One minute to midnight',
  'story.watch': 'Rewatch', 'story.goal': 'Grab the Cog at the bottom of the slope ({n} m)',
  'story.ch': 'Chapter {n}', 'story.best': 'Best score: {n}', 'story.done': 'Story complete — the Baron and the Paradox board are unlocked!',
  'story.reward': 'Reward: {n} shards',
  'era.present': 'Mount Meridian', 'era.present.y': 'Today',
  'era.jurassic': 'Age of Giants', 'era.jurassic.y': '−66,000,000',
  'era.west': 'The Great West', 'era.west.y': '1874',
  'era.chrome': 'The Chrome Age', 'era.chrome.y': '1957',
  'era.neon': 'Neon Nights', 'era.neon.y': '1986',
  'era.future': 'Neo-Meridian', 'era.future.y': '2187',
  'era.void': 'The End of Time', 'era.void.y': '∞',
  'cog.1': 'Stone Cog', 'cog.2': 'Copper Cog', 'cog.3': 'Chrome Cog', 'cog.4': 'Neon Cog',
  'cog.5': 'Cog of Light', 'cog.6': 'The Midnight Hand',
  'ch.1': 'It all begins where nothing had a time yet.', 'ch.2': 'A cog, a stagecoach and a lot of dust.',
  'ch.3': 'Gleaming chrome, milkshakes and flying saucers.', 'ch.4': 'The city never sleeps, and neither does the neon.',
  'ch.5': 'Tomorrow is white, clean… and closely watched.', 'ch.6': "The storm swallows everything. Don't slow down.",

  'cine.skip': 'Skip', 'cine.hold': 'Hold to skip',
  'who.nova': 'Nova', 'who.ada': 'Ada', 'who.baron': 'The Baron', 'who.tic': 'Tic', 'who.narr': '',
  'c.p.card': 'Mount Meridian. One minute to midnight.',
  'c.p.n1': 'Since the dawn of days, the Great Clock of Meridian has kept time flowing.',
  'c.p.n2': 'That night, someone decided to stop it.',
  'c.p.b1': 'Time has run long enough. From now on… it belongs to me!',
  'c.p.a1': 'Nova! The five Cogs have been flung across the ages!',
  'c.p.a2': 'Without them, yesterday, today and tomorrow will unwind like an old spring.',
  'c.p.v1': "Then I'll fetch them. One by one.",
  'c.p.a3': 'Take the Fulgur. It rides the slopes of time.',
  'c.p.a4': "Chain your tricks back to back, without a breath: that's what charges it.",
  'c.p.t1': 'Hoo-hoo! Tick… tock!',
  'c.p.v2': 'Every second counts.',
  'c.1.v1': "The Stone Cog! It's still warm…", 'c.1.t1': 'Hoo?',
  'c.1.v2': "Yes, Tic. Let's go before its mum comes home.", 'c.1.b1': 'A kid on a board… Amusing.',
  'c.2.v1': 'The Copper Cog. It was a stagecoach wheel!',
  'c.2.b1': 'You are picking up my crumbs, child. Time itself is already mine.', 'c.2.v2': "We'll see who's on time.",
  'c.3.v1': 'The Chrome Cog! Stuck inside a jukebox…',
  'c.3.a1': 'Well done, my girl! Two to go. But careful: the Baron is speeding up the clocks.', 'c.3.t1': 'Tick-tick-tick-tick!',
  'c.4.v1': 'The Neon Cog. It shone brighter than the whole city.',
  'c.4.b1': 'Enough games. Meet me at the end of time.', 'c.4.v2': "I'll be there. Early, even.",
  'c.5.v1': 'The Cog of Light! Only the Hand is missing now.',
  'c.5.a1': 'Nova… he took it where clocks go to die.', 'c.5.v2': "The end of time. Then that's where we go.",
  'c.6.b1': 'Look, child! No before, no after. One perfect instant… forever.',
  'c.6.v1': "An instant that never passes isn't perfection. It's a cage.",
  'c.6.v2': 'Fulgur… full power!',
  'c.6.n1': 'Midnight struck. Then one past midnight.',
  'c.6.a1': 'Right on time, my girl.', 'c.6.v3': 'On time… and ready for the next lap.',
  'c.6.end': 'THE END', 'c.6.thanks': 'Thank you for playing.',

  'mp.title': 'Multiplayer', 'mp.quick': 'Quick match', 'mp.quick.sub': 'Join an open race',
  'mp.create': 'Create a room', 'mp.create.sub': 'Invite friends with a code',
  'mp.join': 'Join', 'mp.code': 'Room code', 'mp.ai': 'Race the AI', 'mp.ai.sub': 'Offline, up to 3 rivals',
  'mp.connecting': 'Connecting to the server…', 'mp.offline': 'Server unreachable. Racing the AI is still available.',
  'mp.online': 'Online', 'mp.room': 'Room', 'mp.players': 'Players', 'mp.ready': 'Ready', 'mp.notready': 'Not ready',
  'mp.start': 'Start the race', 'mp.wait': 'Waiting for the host…', 'mp.host': 'Host', 'mp.you': 'you', 'mp.leave': 'Leave room',
  'mp.share': 'Invite', 'mp.share.txt': 'Join my race on BACK2BACK! Code: {code}', 'mp.length': 'Length', 'mp.era': 'Era',
  'mp.random': 'Random', 'mp.rivals': 'Rivals', 'mp.err.full': 'This room is full.', 'mp.err.none': 'Room not found.',
  'mp.err.started': 'The race has already started.', 'mp.err.lost': 'Connection lost.', 'mp.public': 'Public room',
  'mp.server': 'Server address (optional)', 'mp.server.ph': 'wss://my-server.example', 'mp.waiting': 'Waiting for the other riders…',
  'mp.go': 'The race is on!', 'mp.left': '{name} left the race', 'mp.joined': '{name} joined the room',
  'mp.bot': 'AI',
};

const DICT = { fr: FR, en: EN };

export function lang() {
  return save.data.settings.lang === 'en' ? 'en' : 'fr';
}

/** Translate a key, replacing {name} placeholders. */
export function t(key, params) {
  const d = DICT[lang()];
  let s = d[key];
  if (s === undefined) s = FR[key];
  if (s === undefined) return key;
  if (params) for (const k of Object.keys(params)) s = s.split('{' + k + '}').join(params[k]);
  return s;
}

export function fmtNum(n) {
  return Math.round(n).toLocaleString(lang() === 'fr' ? 'fr-FR' : 'en-US').replace(/[  ]/g, ' ');
}

/** Keys present in French but missing in English (developer check). */
export function missingKeys() {
  return Object.keys(FR).filter((k) => !(k in EN)).concat(Object.keys(EN).filter((k) => !(k in FR)).map((k) => 'fr:' + k));
}
