import {rollD20, getToHitData, rollToHit, getDmgData, rollDmg} from './dice.js';


export default function() {
	setupHooks();
	game.mess.toggleItemBonusDamage = toggleItemBonusDamage;
}

/**
 * Heavily based on: https://gitlab.com/foundrynet/dnd5e/-/blob/master/module/macros.js#L42
 * original author: Atropos
 * source repository: https://gitlab.com/foundrynet/dnd5e
 * license: GPLv3
 * @param {*} itemName 
 */
function toggleItemBonusDamage(itemName) {
	const speaker = ChatMessage.getSpeaker();
  let actor;
	if ( speaker.token ) 
		actor = game.actors.tokens[speaker.token];
	if ( !actor ) 
		actor = game.actors.get(speaker.actor);
  // Get matching items
  const items = actor ? actor.items.filter(i => i.name === itemName) : [];
  if ( items.length > 1 ) {
    ui.notifications.warn(`Your controlled Actor ${actor.name} has more than one Item with name ${itemName}. The first matched item will be chosen.`);
  } else if ( items.length === 0 ) {
    return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);
  }
  const item = items[0];

	const newState = !item.getFlag('mess', 'isBonusDamage');
	// toggle bonus dmg
	item.setFlag('mess', 'isBonusDamage', newState);
	return newState;
}

/**
 * Initializes all the hoohks!
 */
function setupHooks() {
	CONFIG.Item.entityClass.chatListeners  = chatListeners.bind(CONFIG.Item.entityClass);

	Hooks.on('preCreateChatMessage', preCreateChatMessageHook);
	Hooks.on('renderActorSheet', actorSheetHook);

	// Bind my own chatListeners to the item class and execute them.
	// Hooks.on('ready', chatListeners.bind(CONFIG.Item.entityClass));

	Hooks.on('renderItemSheet', (app, html, data) => {
		let div = document.createElement('div');
		div.classList.add('form-group');
		div.appendChild(document.createElement('label')).innerText = game.i18n.localize('MESS.itemSheet.bonusDmg');
		let formField = div.appendChild(document.createElement('div'));
		formField.classList.add('form-fields');
		let inp = formField.appendChild(document.createElement('input'));
		inp.type = 'checkbox';
		inp.name = 'flags.mess.isBonusDamage';
		inp.checked = app.object.getFlag('mess', 'isBonusDamage');

		const target = html[0].querySelector('[name="data.formula"]');
		if (target)
			target.closest('.form-group').after(div);
	})
}

/**
 * Makes sure one attack is rolled for every chat card that has a dmg or attack button.
 * @param {Object} data chat message data
 */
async function preCreateChatMessageHook(data) {
	const div = document.createElement('div');
	div.insertAdjacentHTML('afterbegin',  data.content);
	let btn = div.querySelector('button[data-action="attack"]');
	if (!btn)
		btn = div.querySelector('button[data-action="damage"]');
	
	if (btn)
		renderAttack({currentTarget: btn});
}


// TODO: for compendium rolltables
function getFlavor(chatFlavor, target) {
	const rollTableRegExp = /@RollTable\[([^\]])+\](?:\{([^\}]+)\})?/g;
	let rollTables = Array.from(chatFlavor.matchAll(rollTableRegExp));
	if (rollTables) {
		const collection = game.tables;
		for (let tableData of rollTables) {
			let table;
			const id = tableData[0].match(/\[[a-zA-Z0-9]{16}\]/);
			if (id) {
				table = collection.get(id[0].slice(1, -1));
			} else {
				const name = tableData[0].match(/\[([^\]])+\]/)[0].slice(1, -1);
				table = collection.entities.find(e => e.data.name === name);
			}
			let result = table.roll();
			chatFlavor = chatFlavor.replace(tableData[0], result.results.map(e => e.text).join(","));
		}
	}
	return chatFlavor.replace(/\[target\.name\]/g, target.data.name)
}


/**
 * Renders an attack chat card
 * @param {Click Event} ev pointing towards the card that is supposed to initiate the event.
 */
async function renderAttack(ev) {
	if (ev.type === 'click') {
		ev.preventDefault();
		ev.stopPropagation();
	}

	// Extract card data
	const button = ev.currentTarget;
	button.disabled = true;
	const card = button.closest(".chat-card");

	// Get the Actor from a synthetic Token
	const actor = CONFIG.Item.entityClass._getChatCardActor(card);

	if ( !actor || !actor.owner) return;

	// Get the Item
	const item = actor.getOwnedItem(card.dataset.itemId);
	if ( !item ) {
		return ui.notifications.error(`The requested item ${card.dataset.itemId} no longer exists on Actor ${actor.name}`)
	}

	let targets = game.user.targets;
	// Don't roll for all targets if its an AoE, due to only rolling e.g. dmg once for all targets
	// TODO: Maybe add target list or chat cards for making saving throws
	// or not, since it would just spam the chatlog.. hmm
	const areaSkill = Object.keys(CONFIG.DND5E.areaTargetTypes).includes(getProperty(item, 'data.data.target.type'));
	if (!targets.size || areaSkill)
		targets =  [{data: {
				name: "someone",
				img: ""
			}
		}];
	const spellLevel = parseInt(card.dataset.spellLevel) || null;

	const template = 'modules/mess/templates/attack-card.html';

	const attackData = {
		actor, item,
		toHit: await getToHitData({actor, item}),
		dmgs: await getDmgData({actor, item, spellLevel}),
		sceneId: canvas.scene.id,
		user: game.user.id
	}

	const autoroll = game.settings.get('mess', `${game.userId}.autoroll-selector`);

	let rollMode = game.settings.get("core", "rollMode");
	for (const target of targets) {
		const allowed = await item._handleResourceConsumption({isCard: false, isAttack: true});
		const attackTemplateData = {
									...attackData, 
									target: target.data,
									flavor: getFlavor(item.data.data.chatFlavor, target),
									allowed
								};
		let html = await renderTemplate(template, attackTemplateData);

		

		if (autoroll.hit || autoroll.dmg) 
			html = await autoRoll(autoroll, html);


		let chatData = {
      user: game.user._id,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER,
      content: html,
      speaker: {
        actor: item.actor._id,
        token: item.actor.token,
        alias: item.actor.name
			}
		};
		if ( ["gmroll", "blindroll"].includes(rollMode) ) chatData["whisper"] = ChatMessage.getWhisperIDs("GM");
		if ( rollMode === "blindroll" ) chatData["blind"] = true;
	
		ChatMessage.create(chatData);
	}

	button.disabled = false;
}

/**
 * Autorolls hit or dmg, depending on which flag is set and replaces the template string.
 * @param {Object} autoroll Defining whether to autoroll hit or dmg
 * @param {String} template Defining the html template where the roll should happen.
 */
async function autoRoll(autoroll, template) {
	let card = document.createElement('div');
	card.classList.add('message');
	card.insertAdjacentHTML('afterbegin', template);
	if (autoroll.hit) {
		let toHitBtn = card.querySelector('.mess-button-to-hit');
		if (toHitBtn)
			await rollToHit({currentTarget: toHitBtn});
	}

	if (autoroll.dmg) {
		const btns = Array.from(card.querySelectorAll('.mess-button-dmg'));
		for (const btn of btns)
			await rollDmg({currentTarget: btn});
	}
	return card.innerHTML;
}

/**
 * Hook onto the Actor Sheet rendering, modifying the listeners for the roll ability and roll skill check events
 * @param {*} app 
 * @param {*} html 
 * @param {*} data 
 */
async function actorSheetHook(app, html, data) {
	// TODO: Redo this with proper methods... this currently ignores the cool new modifier field
	// maybe just ignore replace the abilitysave etc functions
	const abilityMods = html[0].querySelectorAll('.ability-mod, .ability-name');
	$(abilityMods).off(); // find smth better here!
	abilityMods.forEach(e => e.addEventListener('click', function(ev) {
		ev.stopPropagation();
		ev.preventDefault();

		const abilityId = ev.currentTarget.closest('.ability').dataset.ability;
		const label = CONFIG.DND5E.abilities[abilityId];
    const abl = app.object.data.data.abilities[abilityId];
    const parts = ["@mod"];
    const data = {mod: abl.mod};
    const feats = app.object.data.flags.dnd5e || {};

		// Add feat-related proficiency bonuses
		const actorData = getProperty(app.object, "data.data")
    if ( feats.remarkableAthlete && DND5E.characterFlags.remarkableAthlete.abilities.includes(abilityId) ) {
      parts.push("@remarkable-athlete");
      data["remarkable-athlete"] = Math.ceil(0.5 * actorData.attributes.prof);
    }
    else if ( feats.jackOfAllTrades ) {
      parts.push("@jack-of-all-trades");
      data["jack-of-all-trades"] = Math.floor(0.5 * actorData.attributes.prof);
    }

    // Add global actor bonus
    let actorBonus = getProperty(app.object.data.data.bonuses, "abilities.check");
    if ( !!actorBonus ) {
      parts.push("@checkBonus");
      data.checkBonus = actorBonus;
		}
		
		data.parts = parts;

		data.title = game.i18n.format("DND5E.AbilityPromptTitle", {ability: label});

		rollD20.bind(app.object)(data);
		return true;
	}));
	const saveMods = html[0].querySelectorAll('.ability-save');
	saveMods.forEach(e => e.addEventListener('click', function(ev) {
		ev.stopPropagation();
		ev.preventDefault();
		const abilityId = ev.currentTarget.closest('.ability').dataset.ability;
		const label = CONFIG.DND5E.abilities[abilityId];
    const abl = app.object.data.data.abilities[abilityId];
    const parts = ["@mod"];
    const data = {mod: abl.mod};

    // Include proficiency bonus
    if ( abl.prof > 0 ) {
      parts.push("@prof");
      data.prof = abl.prof;
    }

    // Include a global actor ability save bonus
    const actorBonus = getProperty(app.object.data.data.bonuses, "abilities.save");
    if ( !!actorBonus ) {
      parts.push("@saveBonus");
      data.saveBonus = actorBonus;
    }
		data.title = game.i18n.format("DND5E.SavePromptTitle", {ability: label});
		data.parts = parts;
		rollD20.bind(app.object)(data);
	}));

	const skills = html[0].querySelectorAll('.skill-name');
	$(skills).off();
	skills.forEach(e => e.addEventListener('click', function(ev) {
		ev.stopPropagation();
		ev.preventDefault();
		const skillId = ev.currentTarget.closest('.skill').dataset.skill;
		const skl = app.object.data.data.skills[skillId];

    // Compose roll parts and data
    const parts = ["@mod"];
    const data = {mod: skl.mod + skl.prof};
    if ( skl.bonus ) {
      data["skillBonus"] = skl.bonus;
      parts.push("@skillBonus");
    }

    // Reliable Talent applies to any skill check we have full or better proficiency in
		data.reliableTalent = (skl.value >= 1 && app.object.getFlag("dnd5e", "reliableTalent"));
		data.parts =  parts;
		data.title = game.i18n.format("DND5E.SkillPromptTitle", {skill: CONFIG.DND5E.skills[skillId]});

		rollD20.bind(app.object)(data);
		return false;
	}))
}

/**
 * My own chat listeners
 */
function chatListeners(html) {
	if (!html)
		html = $(document.getElementById('chat-log'));
	html.on('click', '.card-buttons button', onChatCardAction.bind(this));
	html.on('click', '.item-name', this._onChatCardToggleContent.bind(this));
	
	// lets just use this for even more listeners
	html.on('mouseenter', '.mess-chat-target', onMouseEnterTarget);
	html.on('mouseleave', '.mess-chat-target', onMouseLeaveTarget);
	html.on('dblclick', '.mess-chat-target', onDblClickTarget);

	html.on('click', '.mess-button-to-hit', rollToHit);
	html.on('click', '.mess-button-dmg', rollDmg);
}

// Only overwrite stuff for attack buttons
async function onChatCardAction (ev) {
	ev.preventDefault(); ev.stopPropagation();
	if (ev.currentTarget.dataset.action === 'attack')
		return renderAttack(ev);
	if (ev.currentTarget.dataset.action === 'damage')
		return renderAttack(ev);
	if (ev.currentTarget.dataset.placeTemplate)
		return renderTemplate(ev);

	return this._onChatCardAction(ev);		
}

/*****************************************************
 * Mouse Listeners for the target img for chat cards *
 *****************************************************/

async function onMouseEnterTarget(ev) {
	ev.preventDefault();
	ev.stopPropagation();
	const token = await getTargetToken(ev);
	if (!token) return false;

	token._onHoverIn();
}

async function onMouseLeaveTarget(ev) {
	ev.preventDefault();
	ev.stopPropagation();
	const token = await getTargetToken(ev);
	if (!token || !token.visible) return false;
	
	token._onHoverOut();
}

async function onDblClickTarget(ev) {
	ev.preventDefault();
	ev.stopPropagation();
	const token = await getTargetToken(ev);
	if (!token || !token.visible) return false;
	
	const pos = token.center;
	canvas.animatePan({x: pos.x, y: pos.y});
}

async function getTargetToken(ev) {
	const card = ev.currentTarget.closest('.mess-attack-card');
	const sceneId = card.dataset.sceneId;
	if (sceneId !== canvas.scene.id) return false;
	const tokenId = card.dataset.targetId;
	if (!tokenId) return false;

	const token = canvas.tokens.placeables.find(e => e.id === tokenId);
	if (!token) return false;
	return token;
}