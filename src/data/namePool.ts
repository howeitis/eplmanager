// First names and last names by nationality for procedural player generation

interface NameSet {
  firstNames: string[];
  lastNames: string[];
}

export const NAME_POOLS: Record<string, NameSet> = {
  english: {
    firstNames: ['James', 'Harry', 'Jack', 'Oliver', 'Charlie', 'George', 'Alfie', 'Thomas', 'Oscar', 'William', 'Ethan', 'Noah', 'Ben', 'Luke', 'Mason', 'Callum', 'Lewis', 'Ryan', 'Nathan', 'Marcus', 'Aaron', 'Declan', 'Kyle', 'Reece', 'Jude', 'Cole', 'Dominic', 'Conor', 'Kieran', 'Raheem'],
    lastNames: ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Johnson', 'Davies', 'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Roberts', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke', 'Palmer', 'Rice', 'Ward', 'Shaw', 'Gallagher', 'Mitchell', 'Barnes', 'Foden', 'Phillips', 'Stones'],
  },
  french: {
    firstNames: ['Antoine', 'Hugo', 'Lucas', 'Kylian', 'Adrien', 'Moussa', 'Ousmane', 'Theo', 'Jules', 'Rayan', 'Mathis', 'Enzo', 'Liam', 'Noel', 'Paul', 'Raphael', 'Aurelien', 'Ibrahima', 'Youssouf', 'Matteo'],
    lastNames: ['Dupont', 'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Petit', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Garcia', 'Blanc', 'Girard', 'Leroy', 'Fontaine', 'Dembele', 'Konate', 'Camara', 'Diallo'],
  },
  brazilian: {
    firstNames: ['Gabriel', 'Lucas', 'Matheus', 'Pedro', 'Vinicius', 'Rafael', 'Bruno', 'Felipe', 'Gustavo', 'Thiago', 'Igor', 'Andre', 'Diego', 'Joao', 'Henrique', 'Eduardo', 'Marcos', 'Rodrigo', 'Antonio', 'Caio'],
    lastNames: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Pereira', 'Rodrigues', 'Almeida', 'Nascimento', 'Ferreira', 'Araujo', 'Ribeiro', 'Carvalho', 'Mendes', 'Gomes', 'Barbosa', 'Moreira', 'Martins', 'Vieira'],
  },
  spanish: {
    firstNames: ['Carlos', 'David', 'Pablo', 'Alvaro', 'Daniel', 'Sergio', 'Javier', 'Alejandro', 'Marcos', 'Raul', 'Fernando', 'Miguel', 'Roberto', 'Adrian', 'Marc', 'Iker', 'Mikel', 'Pedri', 'Gavi', 'Rodri'],
    lastNames: ['Garcia', 'Martinez', 'Lopez', 'Gonzalez', 'Rodriguez', 'Fernandez', 'Sanchez', 'Perez', 'Gomez', 'Diaz', 'Hernandez', 'Torres', 'Moreno', 'Munoz', 'Alvarez', 'Ruiz', 'Jimenez', 'Romero', 'Navarro', 'Iglesias'],
  },
  portuguese: {
    firstNames: ['Cristiano', 'Bernardo', 'Diogo', 'Ruben', 'Goncalo', 'Joao', 'Pedro', 'Nuno', 'Andre', 'Fabio', 'Bruno', 'Rafael', 'Ricardo', 'Hugo', 'Miguel', 'Tiago', 'Ivo', 'Francisco', 'Luis', 'Sergio'],
    lastNames: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Sousa', 'Fernandes', 'Goncalves', 'Lopes', 'Marques', 'Almeida', 'Ribeiro', 'Pinto', 'Carvalho', 'Mendes', 'Neves', 'Dias'],
  },
  dutch: {
    firstNames: ['Virgil', 'Frenkie', 'Matthijs', 'Cody', 'Jurrien', 'Micky', 'Steven', 'Tijjani', 'Denzel', 'Wout', 'Memphis', 'Donyell', 'Teun', 'Nathan', 'Xavi', 'Jeremie', 'Lutsharel', 'Ian', 'Ryan', 'Jordy'],
    lastNames: ['de Jong', 'van Dijk', 'de Ligt', 'Bergwijn', 'Timber', 'van de Beek', 'Gakpo', 'Dumfries', 'Ake', 'Weghorst', 'Depay', 'Malen', 'Koopmeiners', 'Blind', 'Wijnaldum', 'Frimpong', 'Geertruida', 'Simons', 'Gravenberch', 'Reijnders'],
  },
  german: {
    firstNames: ['Kai', 'Florian', 'Leroy', 'Julian', 'Joshua', 'Leon', 'Niklas', 'Jamal', 'Timo', 'Ilkay', 'Robin', 'Thomas', 'Manuel', 'Antonio', 'Emre', 'Niclas', 'Maximilian', 'Jonas', 'Lukas', 'Konrad'],
    lastNames: ['Muller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Richter', 'Wolf', 'Schroeder', 'Havertz', 'Wirtz', 'Musiala', 'Sane', 'Fullkrug', 'Schlotterbeck'],
  },
  argentinian: {
    firstNames: ['Lionel', 'Julian', 'Enzo', 'Alexis', 'Lautaro', 'Emiliano', 'Gonzalo', 'Angel', 'Nicolas', 'Lisandro', 'Leandro', 'Paulo', 'Rodrigo', 'Cristian', 'Mauro', 'Alejandro', 'Thiago', 'Facundo', 'Valentin', 'Santiago'],
    lastNames: ['Fernandez', 'Martinez', 'Alvarez', 'Romero', 'Di Maria', 'Mac Allister', 'Paredes', 'Molina', 'Montiel', 'Otamendi', 'Palacios', 'Garnacho', 'Lo Celso', 'Tagliafico', 'Correa', 'Gonzalez', 'Ruiz', 'De Paul', 'Dybala', 'Sosa'],
  },
  belgian: {
    firstNames: ['Kevin', 'Romelu', 'Thibaut', 'Youri', 'Leandro', 'Amadou', 'Jeremy', 'Axel', 'Timothy', 'Jan', 'Michy', 'Dennis', 'Jason', 'Thorgan', 'Dries', 'Hans', 'Lois', 'Aster', 'Arthur', 'Zeno'],
    lastNames: ['De Bruyne', 'Hazard', 'Tielemans', 'Onana', 'Doku', 'Castagne', 'Meunier', 'Witsel', 'Vertonghen', 'Alderweireld', 'Trossard', 'Praet', 'Dendoncker', 'Januzaj', 'Openda', 'Theate', 'Bakayoko', 'De Ketelaere', 'Faes', 'Vermeeren'],
  },
  norwegian: {
    firstNames: ['Erling', 'Martin', 'Sander', 'Alexander', 'Jens', 'Fredrik', 'Kristian', 'Morten', 'Lars', 'Ole', 'Birger', 'Stefan', 'Thomas', 'Andreas', 'Henrik', 'Magnus', 'Oscar', 'Tobias', 'Sigurd', 'Ola'],
    lastNames: ['Haaland', 'Odegaard', 'Berge', 'Sorloth', 'Ajer', 'Nyland', 'Thorsby', 'Elyounoussi', 'Normann', 'Meling', 'Hanche-Olsen', 'Ryerson', 'Pedersen', 'Berg', 'Johansen', 'Larsen', 'Hansen', 'Andersen', 'Dahl', 'Strand'],
  },
  danish: {
    firstNames: ['Christian', 'Pierre-Emile', 'Kasper', 'Simon', 'Andreas', 'Thomas', 'Mikkel', 'Joakim', 'Rasmus', 'Viktor', 'Alexander', 'Jonas', 'Martin', 'Morten', 'Nicolai', 'Oliver', 'Jacob', 'Frederik', 'Emil', 'Mathias'],
    lastNames: ['Eriksen', 'Hojbjerg', 'Schmeichel', 'Kjaer', 'Christensen', 'Maehle', 'Damsgaard', 'Dolberg', 'Skov', 'Wind', 'Hjulmand', 'Norgaard', 'Lindstrom', 'Poulsen', 'Jensen', 'Nielsen', 'Andersen', 'Hansen', 'Larsen', 'Olsen'],
  },
  irish: {
    firstNames: ['Seamus', 'Shane', 'James', 'Matt', 'Caoimhin', 'Evan', 'Nathan', 'Robbie', 'Callum', 'Troy', 'Conor', 'Jayson', 'Michael', 'Jack', 'Aaron', 'Liam', 'Darragh', 'Cian', 'Festy', 'Chiedozie'],
    lastNames: ['Coleman', 'Duffy', 'McClean', 'Doherty', 'Kelleher', 'Ferguson', 'Collins', 'Brady', 'Parrott', 'Molumby', 'Ogbene', 'Omobamidele', 'Obafemi', 'Browne', 'Manning', 'Cullen', 'Ebosele', 'Smallbone', 'Knight', 'Coventry'],
  },
  scottish: {
    firstNames: ['Andrew', 'Scott', 'John', 'Kieran', 'Grant', 'Callum', 'Ryan', 'Billy', 'Lewis', 'Liam', 'Stuart', 'Lyndon', 'Jack', 'Greg', 'Kenny', 'James', 'Aaron', 'Ross', 'Declan', 'Craig'],
    lastNames: ['Robertson', 'McTominay', 'McGinn', 'Tierney', 'Adams', 'Hanley', 'McKenna', 'Gilmour', 'Patterson', 'Porteous', 'Ferguson', 'Ralston', 'Christie', 'Dykes', 'Fraser', 'McLean', 'Campbell', 'Gordon', 'Stewart', 'Armstrong'],
  },
  welsh: {
    firstNames: ['Gareth', 'Aaron', 'Ben', 'Daniel', 'Joe', 'Chris', 'Harry', 'Ethan', 'Neco', 'Connor', 'Brennan', 'Sorba', 'Kieffer', 'Tom', 'Mark', 'Sam', 'Rhys', 'David', 'Cameron', 'Jordan'],
    lastNames: ['Bale', 'Ramsey', 'Davies', 'James', 'Allen', 'Moore', 'Wilson', 'Mepham', 'Williams', 'Roberts', 'Johnson', 'Thomas', 'Ampadu', 'Brooks', 'Norrington-Davies', 'Cabango', 'Colwill', 'Sheridan', 'Harris', 'Mayfield'],
  },
  japanese: {
    firstNames: ['Takehiro', 'Kaoru', 'Daichi', 'Wataru', 'Ko', 'Ritsu', 'Takumi', 'Junya', 'Yuki', 'Hidemasa', 'Ao', 'Ayase', 'Mao', 'Koji', 'Reo', 'Keito', 'Kyogo', 'Daizen', 'Sho', 'Yuta'],
    lastNames: ['Tomiyasu', 'Mitoma', 'Kamada', 'Endo', 'Itakura', 'Doan', 'Minamino', 'Ito', 'Soma', 'Morita', 'Tanaka', 'Ueda', 'Hosoya', 'Miyoshi', 'Hatate', 'Nakamura', 'Maeda', 'Furuhashi', 'Sasaki', 'Suzuki'],
  },
  south_korean: {
    firstNames: ['Heung-Min', 'Min-Jae', 'Jee-Seok', 'Woo-Yeong', 'Hee-Chan', 'In-Beom', 'Ui-Jo', 'Seung-Ho', 'Jin-Su', 'Young-Gwon', 'Jun-Ho', 'Chang-Hoon', 'Sang-Ho', 'Tae-Hwan', 'Gue-Sung', 'Dong-Jun', 'Kyung-Won', 'Hyun-Jun', 'Min-Kyu', 'Ji-Sung'],
    lastNames: ['Son', 'Kim', 'Lee', 'Park', 'Hwang', 'Jung', 'Jeong', 'Cho', 'Kwon', 'Hong', 'Song', 'Na', 'Bae', 'Oh', 'Yoon', 'Kang', 'Han', 'Jang', 'Lim', 'Seo'],
  },
  egyptian: {
    firstNames: ['Mohamed', 'Ahmed', 'Omar', 'Mahmoud', 'Mostafa', 'Ali', 'Karim', 'Amr', 'Ibrahim', 'Trezeguet'],
    lastNames: ['Salah', 'Elneny', 'Hegazi', 'El Shenawy', 'Trezeguet', 'Sobhi', 'Mohsen', 'Warda', 'Ashour', 'Fathi'],
  },
  colombian: {
    firstNames: ['Luis', 'James', 'Juan', 'Radamel', 'Yerry', 'David', 'Daniel', 'Jhon', 'Mateus', 'Jefferson'],
    lastNames: ['Diaz', 'Rodriguez', 'Cuadrado', 'Falcao', 'Mina', 'Ospina', 'Zapata', 'Arias', 'Uribe', 'Muriel'],
  },
  uruguayan: {
    firstNames: ['Luis', 'Edinson', 'Federico', 'Diego', 'Jose', 'Ronald', 'Rodrigo', 'Matias', 'Darwin', 'Manuel'],
    lastNames: ['Suarez', 'Cavani', 'Valverde', 'Godin', 'Gimenez', 'Araujo', 'Bentancur', 'Vecino', 'Nunez', 'Ugarte'],
  },
  hungarian: {
    firstNames: ['Dominik', 'Willi', 'Roland', 'Peter', 'Adam', 'Attila', 'Loic', 'Milos', 'Bendeguz', 'Zsolt'],
    lastNames: ['Szoboszlai', 'Orban', 'Sallai', 'Gulacsi', 'Szalai', 'Fiola', 'Nego', 'Kerkez', 'Balogh', 'Nagy'],
  },
  senegalese: {
    firstNames: ['Sadio', 'Kalidou', 'Edouard', 'Idrissa', 'Ismaila', 'Boulaye', 'Pape', 'Famara', 'Cheikhou', 'Abdou'],
    lastNames: ['Mane', 'Koulibaly', 'Mendy', 'Gueye', 'Sarr', 'Dia', 'Diedhiou', 'Kouyate', 'Diallo', 'Cisse'],
  },
  ecuadorian: {
    firstNames: ['Moises', 'Pervis', 'Gonzalo', 'Enner', 'Angel', 'Piero', 'Jeremy', 'Jhegson', 'Carlos', 'Romario'],
    lastNames: ['Caicedo', 'Estupinan', 'Plata', 'Valencia', 'Mena', 'Hincapie', 'Sarmiento', 'Mendez', 'Gruezo', 'Ibarra'],
  },
  ukrainian: {
    firstNames: ['Oleksandr', 'Mykhailo', 'Vitaliy', 'Andriy', 'Ruslan', 'Serhiy', 'Taras', 'Roman', 'Illya', 'Artem'],
    lastNames: ['Zinchenko', 'Mudryk', 'Mykolenko', 'Lunin', 'Malinovsky', 'Dovbyk', 'Stepanenko', 'Tsygankov', 'Zabarnyi', 'Bondar'],
  },
  czech: {
    firstNames: ['Tomas', 'Vladimir', 'Patrik', 'Adam', 'Alex', 'Jan', 'Ondrej', 'Lukas', 'Vaclav', 'Michal'],
    lastNames: ['Soucek', 'Coufal', 'Schick', 'Hlozek', 'Kral', 'Holes', 'Stanek', 'Provod', 'Cerny', 'Sadilek'],
  },
  nigerian: {
    firstNames: ['Victor', 'Kelechi', 'Wilfred', 'Alex', 'Samuel', 'Frank', 'Joe', 'Ola', 'Calvin', 'Semi'],
    lastNames: ['Osimhen', 'Iheanacho', 'Ndidi', 'Iwobi', 'Chukwueze', 'Onyeka', 'Aribo', 'Aina', 'Bassey', 'Ajayi'],
  },
  ghanaian: {
    firstNames: ['Thomas', 'Mohammed', 'Jordan', 'Daniel', 'Inaki', 'Kamaldeen', 'Abdul', 'Andre', 'Tariq', 'Baba'],
    lastNames: ['Partey', 'Kudus', 'Ayew', 'Amartey', 'Williams', 'Sulemana', 'Samed', 'Lamptey', 'Fosu-Mensah', 'Rahman'],
  },
  ivorian: {
    firstNames: ['Nicolas', 'Franck', 'Sebastien', 'Wilfried', 'Max', 'Ibrahim', 'Simon', 'Hamed', 'Serge', 'Jean'],
    lastNames: ['Pepe', 'Kessie', 'Haller', 'Zaha', 'Gradel', 'Sangare', 'Adingra', 'Traore', 'Aurier', 'Seri'],
  },
  jamaican: {
    firstNames: ['Leon', 'Michail', 'Bobby', 'Demarai', 'Ravel', 'Joel', 'Andre', 'Ethan', 'Daniel', 'Kasey'],
    lastNames: ['Bailey', 'Antonio', 'Reid-Decordova', 'Gray', 'Morrison', 'Latibeaudiere', 'Blake', 'Pinnock', 'Johnson', 'Palmer'],
  },
  swedish: {
    firstNames: ['Alexander', 'Dejan', 'Emil', 'Robin', 'Viktor', 'Anthony', 'Mattias', 'Kristoffer', 'Gustav', 'Jesper'],
    lastNames: ['Isak', 'Kulusevski', 'Forsberg', 'Quaison', 'Claesson', 'Elanga', 'Svanberg', 'Olsson', 'Svensson', 'Karlstrom'],
  },
  serbian: {
    firstNames: ['Aleksandar', 'Dusan', 'Sergej', 'Nemanja', 'Filip', 'Luka', 'Sasa', 'Nikola', 'Predrag', 'Ivan'],
    lastNames: ['Mitrovic', 'Vlahovic', 'Milinkovic-Savic', 'Gudelj', 'Kostic', 'Jovic', 'Lukic', 'Milenkovic', 'Rajkovic', 'Pavlovic'],
  },
  american: {
    firstNames: ['Christian', 'Weston', 'Tyler', 'Brenden', 'Giovanni', 'Antonee', 'Chris', 'Jordan', 'Josh', 'Yunus'],
    lastNames: ['Pulisic', 'McKennie', 'Adams', 'Aaronson', 'Reyna', 'Robinson', 'Richards', 'Morris', 'Sargent', 'Musah'],
  },
  mexican: {
    firstNames: ['Raul', 'Hirving', 'Edson', 'Jesus', 'Guillermo', 'Cesar', 'Diego', 'Hector', 'Carlos', 'Orbelín'],
    lastNames: ['Jimenez', 'Lozano', 'Alvarez', 'Corona', 'Ochoa', 'Montes', 'Lainez', 'Herrera', 'Rodriguez', 'Pineda'],
  },
  paraguayan: {
    firstNames: ['Miguel', 'Gustavo', 'Antonio', 'Julio', 'Omar', 'Fabian', 'Derlis', 'Matias', 'Alejandro', 'Robert'],
    lastNames: ['Almiron', 'Gomez', 'Sanabria', 'Enciso', 'Alderete', 'Balbuena', 'Gonzalez', 'Rojas', 'Villasanti', 'Romero'],
  },
  swiss: {
    firstNames: ['Granit', 'Xherdan', 'Manuel', 'Fabian', 'Breel', 'Remo', 'Denis', 'Ricardo', 'Djibril', 'Nico'],
    lastNames: ['Xhaka', 'Shaqiri', 'Akanji', 'Frei', 'Embolo', 'Freuler', 'Zakaria', 'Rodriguez', 'Sow', 'Elvedi'],
  },
  croatian: {
    firstNames: ['Luka', 'Mateo', 'Ivan', 'Marcelo', 'Josko', 'Lovro', 'Mario', 'Andrej', 'Nikola', 'Josip'],
    lastNames: ['Modric', 'Kovacic', 'Perisic', 'Brozovic', 'Gvardiol', 'Majer', 'Pasalic', 'Kramaric', 'Vlasic', 'Juranovic'],
  },
  italian: {
    firstNames: ['Marco', 'Lorenzo', 'Federico', 'Nicolo', 'Gianluigi', 'Alessandro', 'Matteo', 'Gianluca', 'Andrea', 'Sandro'],
    lastNames: ['Verratti', 'Insigne', 'Chiesa', 'Barella', 'Donnarumma', 'Bastoni', 'Tonali', 'Scamacca', 'Raspadori', 'Dimarco'],
  },
  moroccan: {
    firstNames: ['Achraf', 'Hakim', 'Youssef', 'Sofyan', 'Noussair', 'Azzedine', 'Selim', 'Nayef', 'Ilias', 'Bilal'],
    lastNames: ['Hakimi', 'Ziyech', 'En-Nesyri', 'Amrabat', 'Mazraoui', 'Ounahi', 'Amallah', 'Aguerd', 'Chair', 'El Khannouss'],
  },
  turkish: {
    firstNames: ['Hakan', 'Cengiz', 'Yusuf', 'Ferdi', 'Orkun', 'Enes', 'Kerem', 'Irfan', 'Baris', 'Merih'],
    lastNames: ['Calhanoglu', 'Under', 'Yazici', 'Kadioglu', 'Kokcu', 'Unal', 'Akturkoglu', 'Kahveci', 'Yilmaz', 'Demiral'],
  },
  malian: {
    firstNames: ['Amadou', 'Moussa', 'Yves', 'Ibrahim', 'Abdoulaye', 'Kalifa', 'Lassana', 'Sekou', 'Mohamed', 'Cheick'],
    lastNames: ['Haidara', 'Djenepo', 'Bissouma', 'Kone', 'Doucoure', 'Coulibaly', 'Diarra', 'Koita', 'Camara', 'Traore'],
  },
  finnish: {
    firstNames: ['Teemu', 'Joel', 'Robin', 'Rasmus', 'Fredrik', 'Daniel', 'Nikolai', 'Joni', 'Leo', 'Lukas'],
    lastNames: ['Pukki', 'Pohjanpalo', 'Lod', 'Schuller', 'Jensen', 'O\'Shaughnessy', 'Alho', 'Kauko', 'Vaisanen', 'Hradecky'],
  },
  greek: {
    firstNames: ['Vangelis', 'Kostas', 'Giorgos', 'Dimitris', 'Sokratis', 'Petros', 'Anastasios', 'Manolis', 'Thanasis', 'Christos'],
    lastNames: ['Pavlidis', 'Tsimikas', 'Giakoumakis', 'Limnios', 'Papastathopoulos', 'Mantalos', 'Bakasetas', 'Siopis', 'Tzolis', 'Mavropanos'],
  },
  zambian: {
    firstNames: ['Patson', 'Enock', 'Fashion', 'Lubambo', 'Collins', 'Kennedy', 'Emmanuel', 'Spencer', 'Clatous', 'Nathan'],
    lastNames: ['Daka', 'Mwepu', 'Sakala', 'Musonda', 'Sikombe', 'Musonda', 'Banda', 'Mwape', 'Chama', 'Sinkala'],
  },
};

// Map variant nationality keys to pool keys
const NATIONALITY_ALIASES: Record<string, string> = {
  'south-korean': 'south_korean',
};

export function getNamePool(nationality: string): NameSet {
  const key = NATIONALITY_ALIASES[nationality] || nationality.replace(/-/g, '_');
  return NAME_POOLS[key] || NAME_POOLS['english'];
}

/**
 * Infer a player's nationality by scanning all name pools for a match.
 * Used to recover nationality on old saves where the field is missing.
 *
 * Priority: both first + last name match > last name only > first name only > 'english'.
 * Compound last names (e.g. "de Jong", "van Dijk", "Di Maria") are tried before
 * the single final word so they are resolved correctly.
 */
export function inferNationalityFromName(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length < 2) return 'english';

  const firstName = parts[0];
  // Try the full remainder as last name first (handles "de Jong", "van Dijk", etc.)
  const lastNameFull = parts.slice(1).join(' ');
  const lastNameSimple = parts[parts.length - 1];

  const lastNames = lastNameFull === lastNameSimple
    ? [lastNameFull]
    : [lastNameFull, lastNameSimple];

  const hasLastName = (pool: NameSet) => lastNames.some((ln) => pool.lastNames.includes(ln));

  // Prefer pools where both first AND last name match
  for (const [nat, pool] of Object.entries(NAME_POOLS)) {
    if (pool.firstNames.includes(firstName) && hasLastName(pool)) return nat;
  }

  // Fall back: last name only (more distinctive than first names)
  for (const [nat, pool] of Object.entries(NAME_POOLS)) {
    if (hasLastName(pool)) return nat;
  }

  // Fall back: first name only
  for (const [nat, pool] of Object.entries(NAME_POOLS)) {
    if (pool.firstNames.includes(firstName)) return nat;
  }

  return 'english';
}
