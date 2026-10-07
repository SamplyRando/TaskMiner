// Questions answered on the landing page. Every answer reflects the current
// product and the terms of service; keep them in sync when either changes.
export const faqItems: { answer: string; question: string }[] = [
  {
    answer:
      "Non. TaskMiner AI produit un brouillon : vous le relisez, incluez ou écartez chaque tâche, et rien n’est créé tant que vous n’avez pas cliqué sur « Appliquer le plan ». Il en va de même pour les modifications proposées sur un projet existant.",
    question: "TaskMiner AI peut-il créer des tâches sans mon accord ?",
  },
  {
    answer:
      "Le reste de TaskMiner fonctionne normalement : seules les nouvelles demandes à TaskMiner AI sont suspendues jusqu’au mois suivant. Passer le workspace à Pro porte le quota à 500 requêtes par mois.",
    question: "Que se passe-t-il quand le quota de requêtes IA est atteint ?",
  },
  {
    answer:
      "Non. Le plan Free n’est pas un essai : il n’a pas de durée limite et ne demande aucune carte bancaire. Vous passez à Pro seulement si votre équipe a besoin de plus de capacité.",
    question: "Le plan Free est-il limité dans le temps ?",
  },
  {
    answer:
      "Le propriétaire du workspace passe à Pro depuis la page Workspace de l’application, et le paiement est géré par Stripe. L’abonnement est mensuel et se résilie depuis l’espace de facturation : la résiliation prend effet à la fin de la période payée.",
    question: "Comment passer à Pro, et comment résilier ?",
  },
  {
    answer:
      "Chaque membre a un rôle : propriétaire, administrateur, membre ou lecteur. Le journal d’audit, par exemple, est réservé aux propriétaires et aux administrateurs du workspace.",
    question: "Qui voit quoi dans un workspace ?",
  },
];
