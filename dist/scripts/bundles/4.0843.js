(window.webpackJsonp=window.webpackJsonp||[]).push([[4],{"./src/scripts/modify-rolling.js":
/*!***************************************!*\
  !*** ./src/scripts/modify-rolling.js ***!
  \***************************************/
/*! exports provided: default */function(e,t,a){"use strict";async function s(e){return"attack"===e.currentTarget.dataset.action||"damage"===e.currentTarget.dataset.action?i(e):e.currentTarget.dataset.placeTemplate?renderTemplate(e):this._onChatCardAction(e)}async function n({actor:e,item:t}){if(!t.hasAttack)return null;const a=e.data.data,s=t.data.data,n=e.data.flags.dnd5e||{};let r=t.getRollData();const o=["@mod"];("weapon"!==t.data.type||s.proficient)&&o.push("@prof"),r.parts=o;const l=a.bonuses[s.actionType]||{};(s.attackBonus||l.attack)&&(o.push("@atk"),r.atk=[s.attackBonus,l.attack].filterJoin(" + ")),"weapon"===t.data.type&&n.weaponCriticalThreshold&&(r.critical=parseInt(n.weaponCriticalThreshold)),["weapon","spell"].includes(t.data.type)&&n.elvenAccuracy&&["dex","int","wis","cha"].includes(t.abilityMod)&&(r.elvenAccuracy=!0),n.halflingLucky&&(r.halflingLucky=!0);const c=new Roll(r.parts.join("+"),r);return r.totalModifier=c._safeEval(c.formula),r.totalModifier=r.totalModifier>=0?"+"+r.totalModifier:r.totalModifier,r.formula=c.formula,r.terms=c._formula,r}async function r({actor:e,item:t,spellLevel:a=null}){if(!t.hasDamage)return null;const s=e.data.data,n=t.data.data;let r=t.getRollData();if(console.log(n),a&&(r.item.level=a),r.parts=duplicate(n.damage.parts),n.damage.versatile&&r.parts.splice(1,0,[n.damage.versatile,"versatile"]),"spell"===t.data.type)if("cantrip"===n.scaling.mode){let a=[r.parts[0][0]];const o="character"===e.data.type?s.details.level:s.details.spellLevel;t._scaleCantripDamage(a,o,n.scaling.formula),r.parts[0][0]=a[0]}else if(a&&"level"===n.scaling.mode&&n.scaling.formula){let e=[];t._scaleSpellDamage(e,n.level,a,n.scaling.formula),e.length>0&&(e.push("upcast dice"),r.parts.push(e))}const o=s.bonuses[n.actionType]||{};o.damage&&0!==parseInt(o.damage)&&(parts[0][0]+="+@dmg",r.dmg=o.damage);for(let e of r.parts){let t=new Roll(e[0],r);e.push(t.formula)}return r}async function o(e){const t=e.currentTarget;t.disabled=!0;const a=t.closest(".chat-card"),s=a.closest(".message").dataset.messageId,r=CONFIG.Item.entityClass._getChatCardActor(a);if(!r.owner)return!1;const o=r.getOwnedItem(a.dataset.itemId);if(!o)return ui.notifications.error(`The requested item ${a.dataset.itemId} no longer exists on Actor ${r.name}`);let l=await n({actor:r,item:o}),c=game.settings.get("mess",game.userId+".adv-selector"),i=1,d=l.halflingLucky?"r=1":"";"advantage"===c?(i=l.elvenAccuracy?3:2,d+="kh"):"disadvantage"===c&&(i=2,d+="kl"),l.parts.unshift(`${i}d20${d}`);let m=new Roll(l.parts.join("+"),l);m.roll();let u=document.createElement("div");u.title=`${l.parts[0]}+${l.terms} = ${m.formula} = ${m.total}. Click to see rolls.`,u.classList.add("dice-roll"),u.classList.add("mess-dice-result");const g=u.appendChild(document.createElement("span"));g.innerText=m.total,u.insertAdjacentHTML("beforeend",await m.getTooltip()),u.childNodes[1].classList.add("hidden");const p=l.critical||20,f=l.fumble||1,h=m.parts[0].total;if(h>=p&&(g.classList.add("crit"),a.querySelector(".mess-chat-dmg .mess-chat-roll-type").innerHTML+=" - Crit!",a.querySelectorAll(".mess-button-dmg").forEach((e,t)=>{const a=e.dataset.formula,s=new Roll(a);s.alter(0,2),e.innerHTML='<i class="fas fa-dice-d20"></i> '+s.formula,e.dataset.formula=s.formula})),h<=f&&g.classList.add("fumble"),e.currentTarget.parentNode.replaceChild(u,e.currentTarget),s){game.messages.get(s).update({content:a.parentNode.innerHTML})}}async function l(e){const t=e.currentTarget;t.disabled=!0;const a=t.closest(".chat-card"),s=a.closest(".message").dataset.messageId,n=t.dataset.formula;let r=new Roll(n);r.roll();let o=document.createElement("div");if(o.title=`${t.dataset.terms} = ${r.formula} = ${r.total}. Click to see rolls.`,o.classList.add("dice-roll"),o.classList.add("mess-dice-result"),o.appendChild(document.createElement("span")).innerText=r.total,o.insertAdjacentHTML("beforeend",await r.getTooltip()),o.childNodes[1].classList.add("hidden"),e.currentTarget.parentNode.replaceChild(o,e.currentTarget),s){game.messages.get(s).update({content:a.parentNode.innerHTML})}}async function c(e,t){let a=document.createElement("div");if(a.classList.add("message"),a.insertAdjacentHTML("afterbegin",t),e.hit){let e=a.querySelector(".mess-button-to-hit");e&&await o({currentTarget:e})}if(e.dmg){const e=Array.from(a.querySelectorAll(".mess-button-dmg"));for(const t of e)await l({currentTarget:t})}return a.innerHTML}async function i(e){"click"===e.type&&(e.preventDefault(),e.stopPropagation());const t=e.currentTarget;t.disabled=!0;const a=t.closest(".chat-card"),s=CONFIG.Item.entityClass._getChatCardActor(a);if(!s||!s.owner)return;const o=s.getOwnedItem(a.dataset.itemId);if(!o)return ui.notifications.error(`The requested item ${a.dataset.itemId} no longer exists on Actor ${s.name}`);let l=game.user.targets;l.size||(l=[{data:{name:"someone",img:""}}]);const i=parseInt(a.dataset.spellLevel)||null,d={actor:s,item:o,toHit:await n({actor:s,item:o}),dmgs:await r({actor:s,item:o,spellLevel:i}),sceneId:canvas.scene.id},m=game.settings.get("mess",game.userId+".autoroll-selector");for(const e of l){const t={...d,target:e.data,flavor:o.data.data.chatFlavor.replace(/\[target\.name\]/g,e.data.name)};let a=await renderTemplate("modules/mess/templates/attack-card.html",t);(m.hit||m.dmg)&&(a=await c(m,a)),ChatMessage.create({user:game.user._id,type:CONST.CHAT_MESSAGE_TYPES.OTHER,content:a,speaker:{actor:o.actor._id,token:o.actor.token,alias:o.actor.name}})}t.disabled=!1}async function d(e){const t=e.currentTarget.closest(".mess-attack-card");if(t.dataset.sceneId!==canvas.scene.id)return!1;const a=t.dataset.targetId;if(!a)return!1;const s=canvas.tokens.placeables.find(e=>e.id===a);return s||!1}async function m(e){e.preventDefault(),e.stopPropagation();const t=await d(e);if(!t)return!1;t._onHoverIn()}async function u(e){e.preventDefault(),e.stopPropagation();const t=await d(e);if(!t||!t.visible)return!1;t._onHoverOut()}async function g(e){e.preventDefault(),e.stopPropagation();const t=await d(e);if(!t||!t.visible)return!1;const a=t.center;canvas.animatePan({x:a.x,y:a.y})}function p(){game.settings.register("mess",game.userId+".adv-selector",{name:"Mess - Advantage Selector",default:"normal",type:String,scope:"user"}),game.settings.register("mess",game.userId+".autoroll-selector",{name:"Mess - Autoroll Selector",default:{hit:!1,dmg:!1},type:Object,scope:"user"}),Hooks.on("renderChatLog",async(e,t,a)=>{const s=await async function(){const e=document.createElement("div");e.classList.add("mess-roll-control");const t=game.settings.get("mess",game.userId+".adv-selector"),a={advantage:"advantage"===t,normal:"normal"===t,disadvantage:"disadvantage"===t,...game.settings.get("mess",game.userId+".autoroll-selector")};return e.insertAdjacentHTML("afterbegin",await renderTemplate("modules/mess/templates/roll-control.html",a)),e.querySelectorAll(".mess-adv-selector a").forEach(e=>{e.addEventListener("click",(async function(e){if(e.preventDefault(),e.stopPropagation(),e.currentTarget.classList.contains("mess-selected"))return!1;e.currentTarget.parentNode.querySelector(".mess-selected").classList.remove("mess-selected"),e.currentTarget.classList.add("mess-selected"),game.settings.set("mess",game.userId+".adv-selector",e.currentTarget.name)}))}),e.querySelectorAll(".mess-autoroll-selector a").forEach(e=>{e.addEventListener("click",(async function(e){e.preventDefault(),e.stopPropagation(),e.currentTarget.classList.toggle("mess-selected");let t=game.settings.get("mess",game.userId+".autoroll-selector");t[e.currentTarget.name]=e.currentTarget.classList.contains("mess-selected"),game.settings.set("mess",game.userId+".autoroll-selector",t)}))}),e}(),n=t[0].querySelector("#chat-controls");n.insertBefore(s,n.childNodes[0])}),CONFIG.Item.entityClass.chatListeners=function(e){e.on("click",".card-buttons button",s.bind(this)),e.on("click",".item-name",this._onChatCardToggleContent.bind(this)),e.on("mouseenter",".mess-chat-target",m),e.on("mouseleave",".mess-chat-target",u),e.on("dblclick",".mess-chat-target",g),e.on("click",".mess-button-to-hit",o),e.on("click",".mess-button-dmg",l)},Hooks.on("preCreateChatMessage",async e=>{const t=document.createElement("div");t.insertAdjacentHTML("afterbegin",e.content);let a=t.querySelector('button[data-action="attack"]');a||(a=t.querySelector('button[data-action="damage"]')),a&&i({currentTarget:a})}),async function(){const e=(await import("/systems/dnd5e/module/pixi/ability-template.js")).AbilityTemplate,t=e.fromItem;e.fromItem=function(e){const a=t.bind(this)(e);return loadTexture("spellTemplates/727102-fireball 8x8.webm").then(e=>{a.texture=e,a.refresh()}),a},e.prototype._onDragLeftMove,e.prototype._onDragLeftMove=function(e){_originalDragLeftMove(e)}}()}a.r(t),a.d(t,"default",(function(){return p}))}}]);
//# sourceMappingURL=4.0843.js.map