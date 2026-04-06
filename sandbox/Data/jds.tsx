// Sandbox test JDs — mixed domain, mixed language
// JD_01: Finance / Accounting    — German   — HIGH match with CV_01
// JD_02: Software Engineering    — English  — HIGH match with CV_02
// JD_03: Head of Product         — English  — MEDIUM match with CV_03
// JD_04: UX / Product Design     — German   — HIGH match with CV_04
// JD_05: Nursing / Clinical Care — French   — HIGH match with CV_05

export const sampleJdsText = `

=== JD_START: JD_01 ===
Senior Accountant / Head of Accounting (m/w/d)
Sprache: Deutsch | Branche: Finance | Erwartetes Ergebnis: apply_confidently

Unternehmen: Mittelständisches Produktionsunternehmen, ca. 500 Mitarbeiter, internationale Aktivitäten.

Ihre Aufgaben:
- Eigenverantwortliche Führung der Finanzbuchhaltung (Debitoren, Kreditoren, Hauptbuch)
- Erstellung von Monats-, Quartals- und Jahresabschlüssen nach HGB
- Intercompany-Abstimmungen und Konsolidierungsvorbereitung
- Ansprechpartner für Wirtschaftsprüfer, Steuerberater und interne Stakeholder
- Verantwortung für Umsatzsteuervoranmeldungen und sonstige Steuermeldungen
- Mitarbeit bei der Optimierung von Buchhaltungsprozessen und ERP-Systembetreuung
- Führung und Weiterentwicklung eines kleinen Buchhaltungsteams (2–3 Personen)

Ihr Profil:
- Abgeschlossenes betriebswirtschaftliches Studium oder kaufmännische Ausbildung mit Weiterbildung zum Bilanzbuchhalter (IHK)
- Mindestens 5 Jahre Berufserfahrung in der Finanzbuchhaltung, davon 2 Jahre in leitender Funktion
- Fundierte HGB-Kenntnisse; IFRS-Kenntnisse von Vorteil
- Sicherer Umgang mit SAP FI/CO oder vergleichbarem ERP-System
- Sehr gute MS-Excel-Kenntnisse
- Strukturierte, eigenverantwortliche Arbeitsweise und ausgeprägte Kommunikationsstärke
- Sehr gute Deutschkenntnisse, gute Englischkenntnisse
=== JD_END: JD_01 ===

=== JD_START: JD_02 ===
Senior Software Engineer — Full-Stack (Node.js / React)
Language: English | Domain: Technology | Expected outcome: apply_confidently

Company: B2B SaaS scale-up, Series B, ~200 engineers globally.

Responsibilities:
- Design, build and maintain scalable backend services using Node.js and TypeScript
- Build performant React frontends with a focus on developer experience and accessibility
- Participate in architecture decisions, RFC processes and technical roadmap planning
- Conduct code reviews and mentor engineers at junior and mid levels
- Collaborate with product and design to break down features into well-scoped engineering work
- Contribute to CI/CD pipelines, observability tooling and incident response practices
- Identify and drive technical debt reduction in partnership with engineering leadership

Requirements:
- 5+ years of professional software engineering experience
- Strong proficiency in Node.js and TypeScript; React experience required
- Solid understanding of relational databases (PostgreSQL preferred) and REST API design
- Experience with cloud infrastructure (AWS or GCP); infrastructure-as-code a strong plus
- Familiarity with containerisation (Docker, Kubernetes)
- Strong communication skills; comfortable working in cross-functional, distributed teams
- Experience in an agile/scrum environment
- Bachelor's degree in Computer Science or equivalent practical experience
=== JD_END: JD_02 ===

=== JD_START: JD_03 ===
Head of Product
Language: English | Domain: Technology / Product | Expected outcome: apply_with_care

Company: Early-stage fintech, seed-funded, team of 35, London-based with remote option.

Responsibilities:
- Define and own the product vision, strategy and multi-quarter roadmap
- Lead a team of 3 product managers and work closely with design and engineering
- Translate customer insight, market research and business goals into prioritised product bets
- Drive the product discovery process: customer interviews, prototyping, validation
- Own product metrics and reporting cadence to leadership and investors
- Build strong relationships with sales, customer success and operations to close the feedback loop
- Recruit and develop product talent as the team scales

Requirements:
- 7+ years of product management experience, with at least 2 years in a leadership role
- Track record of shipping product in a fast-paced, resource-constrained environment
- Strong analytical mindset; comfortable with data, experimentation and A/B testing
- Excellent written and verbal communication; able to present to investors and board
- Experience in fintech, payments or regulated industries strongly preferred
- Prior experience at a startup or scale-up at a similar stage
- Fluent English required; additional European language a plus
=== JD_END: JD_03 ===

=== JD_START: JD_04 ===
UX / Product Designer (Senior) (m/w/d)
Sprache: Deutsch | Branche: Digital / Design | Erwartetes Ergebnis: apply_confidently

Unternehmen: Digitalagentur mit 80 Mitarbeitenden, Fokus auf Enterprise-Web- und App-Produkte.

Ihre Aufgaben:
- Verantwortung für den gesamten Designprozess von der Nutzerrecherche bis zum fertigen Prototypen
- Durchführung von Nutzerinterviews, Usability-Tests und heuristischen Analysen
- Entwicklung von Wireframes, User Flows und hochauflösenden Prototypen in Figma
- Enge Zusammenarbeit mit Produktmanagement und Entwicklungsteams in agilen Sprints
- Pflege und Weiterentwicklung des unternehmensweiten Design Systems
- Präsentation von Designentscheidungen und Forschungsergebnissen vor Kunden und Stakeholdern
- Mentoring von Junior Designern

Ihr Profil:
- Abgeschlossenes Studium in Interaction Design, Kommunikationsdesign oder vergleichbar
- Mindestens 4 Jahre Berufserfahrung im UX/Product Design, idealerweise im Agentur- oder Produktumfeld
- Sehr gute Kenntnisse in Figma; Erfahrung mit anderen Prototyping-Tools von Vorteil
- Fundierte Kenntnisse in nutzerzentrierten Designmethoden (Design Thinking, Jobs-to-be-Done)
- Erfahrung im Aufbau und der Pflege von Design Systems
- Ausgeprägte Kommunikationsfähigkeit und strukturierte Präsentationsstärke
- Sehr gute Deutschkenntnisse erforderlich, gute Englischkenntnisse
=== JD_END: JD_04 ===

=== JD_START: JD_05 ===
Infirmier·ère Diplômé·e d'État — Service de Médecine Interne
Langue: Français | Domaine: Santé / Soins cliniques | Résultat attendu: apply_confidently

Établissement: Hôpital universitaire régional, service de médecine interne, 320 lits.

Missions:
- Assurer la prise en charge globale des patients hospitalisés en médecine interne
- Réaliser les soins infirmiers prescrits et surveiller l'état clinique des patients
- Administrer les traitements médicamenteux et assurer la traçabilité dans le dossier patient informatisé
- Collaborer avec l'équipe pluridisciplinaire (médecins, aides-soignants, kinésithérapeutes, assistantes sociales)
- Participer aux transmissions orales et écrites en équipe de soins
- Accompagner les patients et leurs proches tout au long de l'hospitalisation
- Participer à la démarche qualité et à l'accueil des stagiaires

Profil recherché:
- Diplôme d'État d'Infirmier(ère) obligatoire
- Expérience souhaitée en médecine interne, polyvalente ou aux urgences
- Maîtrise des soins techniques (perfusions, prélèvements, pansements complexes)
- Bonne connaissance des outils informatiques de soins (DPI)
- Capacité à travailler en équipe pluridisciplinaire et en horaires décalés
- Sens des responsabilités, rigueur clinique et empathie
- Maîtrise du français indispensable
=== JD_END: JD_05 ===

`;
