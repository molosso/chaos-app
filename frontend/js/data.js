/* ------------------------------------------------------------
   Chaos Français - data.js
   Content banks used by every module. Pure data, no DOM code.
------------------------------------------------------------ */

const CHAOS_DATA = {

  eloquenceTopics: [
    "Les pigeons devraient diriger l'université.",
    "Il faut remplacer les examens par des duels de mimes.",
    "Le café froid est supérieur au café chaud.",
    "Les chaussettes dépareillées devraient être obligatoires.",
    "Les robots devraient corriger les copies à la place des professeurs.",
    "Il est temps d'interdire les ascenseurs silencieux.",
    "Les chats devraient voter aux élections municipales.",
    "La sieste doit devenir une matière scolaire.",
    "Les parapluies sont une invention ratée.",
    "Il faut donner un jour férié en l'honneur des lundis.",
    "Les emojis devraient remplacer la ponctuation.",
    "On ne devrait plus jamais dire bonjour, seulement chanter.",
    "Le télétravail des poissons rouges doit être encouragé.",
    "Les ascenseurs devraient raconter des blagues.",
    "Il faut instaurer un permis pour posséder une trottinette.",
    "Les devoirs devraient être notés par le chien de la maison.",
    "Le silence en cours devrait être payant.",
    "Il faut remplacer les sonneries d'école par des fanfares.",
    "Les correcteurs orthographiques devraient avoir le droit de vote.",
    "Une réunion sur deux devrait se tenir en pyjama."
  ],

  eloquenceWords: [
    "pizza", "fusée", "chat", "parapluie", "trottinette", "sandwich",
    "fantôme", "aspirateur", "cactus", "karaoké", "boussole", "yaourt",
    "cravate", "hamac", "plafond", "toboggan", "girafe", "photocopieuse"
  ],

  storyElements: {
    characters: [
      "une étudiante insomniaque", "un facteur superstitieux", "une grand-mère pilote de course",
      "un robot de cantine", "une journaliste allergique aux nouvelles", "un chat qui déteste le silence",
      "un professeur qui parle à l'envers", "une astronaute qui a le vertige",
      "un vendeur de parapluies pendant la sécheresse", "une voisine qui collectionne les horloges"
    ],
    places: [
      "un désert", "un ascenseur bloqué", "une bibliothèque fermée depuis 1998",
      "une station de métro fantôme", "un marché aux poissons désert",
      "le sommet d'une tour de bureaux", "une salle de classe vide un dimanche",
      "un vestiaire de piscine", "une épicerie de nuit", "un studio de radio abandonné"
    ],
    objects: [
      "un téléphone qui ne sonne qu'en retard", "une clé qui n'ouvre aucune porte connue",
      "un carnet dont les pages se réécrivent seules", "une horloge qui avance à reculons",
      "un billet de train pour une ville qui n'existe plus", "une radio qui capte hier",
      "un miroir qui montre la mauvaise saison", "une valise plus lourde à chaque étape",
      "un stylo qui écrit tout seul la nuit", "une carte postale jamais envoyée"
    ]
  },

  storyFormats: [
    { id: "recit", label: "Récit" },
    { id: "sms", label: "Conversation SMS" },
    { id: "scenario", label: "Scénario de film" },
    { id: "poeme", label: "Poème" },
    { id: "article", label: "Article de presse" }
  ],

  storyBans: [
    "mais", "très", "chose", "bien", "alors"
  ],

  storyGrammar: [
    "le passé composé", "l'imparfait", "le futur simple", "le conditionnel",
    "le subjonctif présent", "des phrases exclusivement au présent"
  ],

  memeSituations: [
    "avant un examen", "en réunion de groupe à 23h la veille du rendu",
    "quand le professeur dit que le contrôle sera facile",
    "le premier jour de cours après les vacances",
    "quand quelqu'un lit par-dessus ton épaule",
    "en attendant les résultats", "au moment de rendre une copie blanche",
    "quand le wifi tombe pendant l'exposé", "le lundi 8h",
    "quand on comprend la blague dix minutes trop tard",
    "en salle d'attente chez le dentiste", "quand le prof pose une question et fixe la classe",
    "après avoir dit une bêtise en public", "en cherchant ses clés pendant vingt minutes",
    "quand l'imprimante tombe en panne juste avant le cours"
  ],

  fakeNewsTopics: [
    "Un chat est élu maire d'une petite ville.",
    "Une école remplace les notes par des concours de grimaces.",
    "Un distributeur de café se met à parler en alexandrins.",
    "Une ville entière décide de ne communiquer que par chansons.",
    "Un pigeon devient le nouveau mascotte officiel d'une équipe de football.",
    "Un supermarché instaure une caisse réservée aux indécis.",
    "Une bibliothèque municipale n'accepte plus que les livres écrits à l'envers.",
    "Un village organise un championnat de sieste.",
    "Une entreprise remplace toutes ses réunions par des parties de cache-cache.",
    "Un GPS se met à donner des conseils de vie plutôt que des directions.",
    "Une classe entière apprend qu'elle a cours dans le mauvais bâtiment depuis un mois.",
    "Un facteur bat le record du monde de lenteur avec fierté.",
    "Une ville installe des feux rouges qui racontent des blagues.",
    "Un zoo échange accidentellement les pancartes de tous ses animaux.",
    "Une mairie propose des amendes payables en gâteaux faits maison."
  ],

  imageStoryPrompts: [
    "Imagine ce qui s'est passé juste avant cette image.",
    "Imagine ce que la personne ou l'objet au centre de l'image pense en ce moment.",
    "Imagine ce qui se passe juste après cette image.",
    "Raconte cette scène du point de vue d'un témoin caché.",
    "Explique comment cette situation a mal tourné, puis comment elle s'est arrangée.",
    "Décris cette image comme si elle datait d'il y a cent ans.",
    "Raconte cette scène comme un flash info à la radio."
  ],

  improvScenes: [
    { character: "un vendeur très maladroit", situation: "vendre une machine dont personne ne connaît l'usage", goal: "faire rire le public sans jamais expliquer clairement l'objet" },
    { character: "un guide touristique qui a perdu son groupe", situation: "improviser une visite dans un endroit qu'il ne connaît pas", goal: "garder son sérieux devant l'absurdité de la situation" },
    { character: "un chef étoilé", situation: "cuisiner avec les seuls ingrédients trouvés dans un tiroir de bureau", goal: "convaincre un client difficile" },
    { character: "un détective très distrait", situation: "résoudre une enquête alors qu'il a oublié l'indice principal", goal: "garder l'air compétent" },
    { character: "un employé d'accueil dans un hôtel très étrange", situation: "gérer une réclamation impossible", goal: "rester poli jusqu'au bout" },
    { character: "un professeur remplaçant qui n'a jamais lu le programme", situation: "donner un cours improvisé", goal: "faire croire qu'il maîtrise totalement le sujet" },
    { character: "un pilote de ligne un peu nerveux", situation: "rassurer les passagers pendant une annonce", goal: "cacher son inquiétude derrière un ton très calme" },
    { character: "un(e) journaliste en direct", situation: "commenter un événement qu'il ou elle n'a pas du tout suivi", goal: "improviser un commentaire crédible" }
  ],

  badges: [
    { id: "sarcasme", label: "Maître du sarcasme" },
    { id: "poete", label: "Poète fou" },
    { id: "journaliste", label: "Journaliste du futur" },
    { id: "orateur", label: "Orateur légendaire" },
    { id: "improvisateur", label: "Improvisateur en série" },
    { id: "scenariste", label: "Scénariste express" }
  ],

  wheelSujets: [
    "défendre une idée absurde", "raconter une catastrophe évitée de justesse",
    "vendre un objet inutile", "convaincre quelqu'un de changer d'avis",
    "expliquer un retard improbable", "présenter une découverte imaginaire"
  ],

  wheelStyles: [
    "drôle", "dramatique", "absurde", "solennel", "chuchoté", "en mode flash info"
  ],

  wheelFormats: [
    "un SMS", "un poème", "une fausse actualité", "un discours",
    "une annonce de gare", "une lettre officielle"
  ],

  wheelContraintes: [
    "un mot est interdit : \"mais\"", "trois mots imposés : pizza, fusée, chat",
    "temps limité : 60 secondes", "aucune phrase ne peut dépasser dix mots",
    "il faut parler à la deuxième personne du pluriel", "il faut terminer par une question"
  ]

};

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function pickSeveral(list, count) {
  const copy = list.slice();
  const result = [];
  while (result.length < count && copy.length > 0) {
    const index = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(index, 1)[0]);
  }
  return result;
}
