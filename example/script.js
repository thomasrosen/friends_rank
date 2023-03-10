
class FriendRank {

	people = store.get('people') || {}
	questions = store.get('questions') || {}
	answers = store.get('answers') || []
	filteredHashtags = new Set(store.get('filteredHashtags')) || new Set()

	/*
		STRUCTURE:

		people = {
			'personID': {
				name: String,
				timeAdded: Number,
				// hidden: Boolean,

				birthday: String, // ISO standard. Unkown parts are in underscores.
				birthday_ts: Number, // Best timestamp estimate for the birthday-string.

				notes: String, // free text. this can include hashtags, emails, phone numbers, etc. This could be parsed with a regex or gpt3.

				hashtags_array: [String], ['berlin', 'bonn']

				socials: {
					twitter: String,
					facebook: String,
					instagram: String,
					github: String,
				},
			}
		}
		question = {
			'questionID': {
				question: String,
				position: Number,
				timeAdded: Number,
				// hidden: Boolean,
			}
		}
		answers = [
			{
				questionID: String,
				sortedPersonIDs: [String],
				timeAdded: Number,
			}
		]


	*/
	
	uuidv4() {
		return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
			(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
		)
	}

	saveData(){
		return new Promise((resolve)=>{
			store.set('people', this.people)
			store.set('questions', this.questions)
			store.set('answers', this.answers)
			store.set('filteredHashtags', [...this.filteredHashtags])
			resolve()
		})
	}

	addPerson(personObj){
		return new Promise(async (resolve)=>{
			const newPersonID = this.uuidv4()
			this.people[newPersonID] = personObj
			await this.saveData()
			resolve()
		})
	}
	updatePerson(personID, newPersonObj){
		return new Promise(async (resolve)=>{
			this.people[personID] = {
				...this.people[personID], // currently only allow name changes
				socials: newPersonObj.socials,
				name: newPersonObj.name,
				notes: newPersonObj.notes,
				hashtags_array: newPersonObj.hashtags_array,
			}
			await this.saveData()
			resolve()
		})
	}
	deletePerson(personID_to_delete){
		return new Promise(async (resolve)=>{
			this.answers = this.answers
			.map(answer => ({
				...answer,
				sortedPersonIDs: answer.sortedPersonIDs.filter(personID => personID !== personID_to_delete)
			}))
			.filter(answer => answer.sortedPersonIDs.length > 0)

			delete this.people[personID_to_delete]
			await this.saveData()
			resolve()
		})
	}

	addQuestion(questionObj){
		return new Promise(async (resolve)=>{
			const newQuestionID = this.uuidv4()
			this.questions[newQuestionID] = questionObj
			await this.saveData()
			resolve()
		})
	}
	updateQuestion(questionID, newQuestionObj){
		return new Promise(async (resolve)=>{
			this.questions[questionID] = {
				...this.questions[questionID], // currently only allow question and position changes
				question: newQuestionObj.question,
				position: newQuestionObj.position,
			}
			await this.saveData()
			resolve()
		})
	}
	deleteQuestion(questionID_to_delete){
		return new Promise(async (resolve)=>{
			this.answers = this.answers.filter(answer => answer.questionID !== questionID_to_delete)
			delete this.questions[questionID_to_delete]
			await this.saveData()
			resolve()
		})
	}

	addAnswer(answerObj){
		return new Promise(async (resolve)=>{
			this.answers.push(answerObj)
			await this.saveData()
			resolve()
		})
	}

	rankPeople(){
		// const questionIDs = []
		// const timeFrame_endTS = new Date()*1
		// const timeFrame_startTS = timeFrame_endTS - 15778800 // 15778800 = 6 month

		let people = this.answers
		// .filter(answer => (
		// 	answer.timeAdded > timeFrame_startTS
		// 	&& answer.timeAdded < timeFrame_endTS
		// ))
		.reduce((people, answer) => {
			const sortedPersonIDs = answer.sortedPersonIDs
			const stepLength = 1/sortedPersonIDs.length

			// TODO only use newest answer to a question
			let questionWeight = 1
			if (!!this.questions[answer.questionID]){
				questionWeight = this.questions[answer.questionID].position*0.5+0.5
			}

			let currentRank = 1
			for (const personID of sortedPersonIDs) {
				if (!(!!people[personID])) {
					people[personID] = {
						score: 0,
						count: 0,
					}
				}

				// if (personID === this.benjiID) {
				// 	console.log(' ')
				// 	console.log('currentRank', currentRank)
				// 	console.log('questionWeight', questionWeight)
				// }

				people[personID].score += currentRank * questionWeight
				people[personID].count += 1

				currentRank -= stepLength
			}

			return people
		}, {})

		people = Object.entries(people)

		people = people
			.map(person => {
				// if (person[0] === '2e7c6df7-8c2b-4ebf-b17b-64c4deda4cd2') {
				// 	console.log(person)
				// }
				person[1].score = (person[1].score/person[1].count)*10
				return person
			})

		const max_answer_count = Math.max(
			...(people.map(person => person[1].count))
		)
		const min_answer_count = Math.min(
			...(people.map(person => person[1].count))
		)
		const avarege_answer_count = max_answer_count*0.5 // /min_answer_count

		people = people.map(personEntry => ({
			personID: personEntry[0],
			opacity: personEntry[1].score / max_answer_count,
			score: personEntry[1].score / avarege_answer_count,
			count: personEntry[1].count,
			value: personEntry[1],
			name: this.people[personEntry[0]].name,
			notes: this.people[personEntry[0]].notes,
			hashtags_array: this.people[personEntry[0]].hashtags_array,
			timeAdded: this.people[personEntry[0]].timeAdded,
		}))

		const rankedPeopleIDs = people.map(person => person.personID)

		for (const personEntry of Object.entries(this.people)) {
			if (!rankedPeopleIDs.includes(personEntry[0])) {
				people.push({
					personID: personEntry[0],
					score: 0,
					name: personEntry[1].name,
					hashtags_array: personEntry[1].hashtags_array,
					timeAdded: personEntry[1].timeAdded,
				})
			}
		}
		
		people = people.sort((a, b) => {
			const n = b.score - a.score
			if (n !== 0) {
				return n
			}
			return a.timeAdded - b.timeAdded
		})

		// only show people with one of the filtered hashtags
		if (this.filteredHashtags.size > 0) {
			people = people.filter(person => {
				if (Array.isArray(person.hashtags_array)) {
					const filteredArray = person.hashtags_array.filter(hashtag => this.filteredHashtags.has(hashtag))
					return filteredArray.length > 0
				}
				return false
			})
		}

		return people
	}
	getAllHashtags() {
		const hashtags = Object.values(this.people)
			.reduce((hashtags, person) => {
				if (person.hasOwnProperty('hashtags_array') && Array.isArray(person.hashtags_array)) {
					for (const hashtag of person.hashtags_array) {
						if (!hashtags[hashtag]) {
							hashtags[hashtag] = {
								hashtag: hashtag,
								count: 0,
								active: this.filteredHashtags.has(hashtag),
							}
						}
						hashtags[hashtag].count += 1
					}
				}
				return hashtags
			}, {})
		return Object.values(hashtags)
	}
	toggleHashtagFilter(hashtag) {
		if (hashtag === 'none') {
			this.filteredHashtags = new Set()
		} else if (hashtag === 'invert') {
			const newFilteredHashtags = this.filteredHashtags

			for (const hashtag_info of this.getAllHashtags()) {
				const hashtag = hashtag_info.hashtag.toLowerCase()
				if (newFilteredHashtags.has(hashtag)) {
					newFilteredHashtags.delete(hashtag)
				} else {
					newFilteredHashtags.add(hashtag)
				}
			}

			this.filteredHashtags = newFilteredHashtags
		} else {
			const newFilteredHashtags = this.filteredHashtags
			if (newFilteredHashtags.has(hashtag)) {
				newFilteredHashtags.delete(hashtag)
			} else {
				newFilteredHashtags.add(hashtag)
			}
			this.filteredHashtags = newFilteredHashtags
		}

		this.saveData()
	}
	getFilteredHashtags() {
		return this.filteredHashtags
	}

	exportEverything(){
		return {
			metadata: {
				timeExported: new Date()*1,
			},
			people: this.people,
			questions: this.questions,
			answers: this.answers,
			filteredHashtags: [...this.filteredHashtags],
		}
	}
	import(object){
		return new Promise(async (resolve)=>{
			console.log('object', object)
			this.people = object.people || {}
			this.questions = object.questions || {}
			this.answers = object.answers || []
			this.filteredHashtags = new Set()
			if (Array.isArray(object.filteredHashtags)) {
				this.filteredHashtags = new Set(...object.filteredHashtags)
			}

			await this.upgradeData()

			await this.saveData()
			resolve()
		})
	}

	upgradeData(){
		return new Promise(async (resolve) => {
			this.people = (this.people || {})

			for (const person_id in this.people) {
				const person = this.people[person_id]

				if (!person.notes && !!person.hashtags) {
					person.notes = person.hashtags
					this.people[person_id]
				}
			}

			resolve()
		})
	}

}





/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
	// SOURCE: https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getRandomIntInclusive(min, max) {
	// SOURCE: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive 
}

function stringToColor(str) {
	// source question: https://stackoverflow.com/questions/3426404/create-a-hexadecimal-colour-based-on-a-string-with-javascript
	// source answer: https://stackoverflow.com/a/3426956/2387277
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	let colour = '#';
	for (let i = 0; i < 3; i++) {
		const value = (hash >> (i * 8)) & 0xFF;
		colour += ('00' + value.toString(16)).substr(-2);
	}
	return colour;
}

function hexToRGBArray(color) {
	if (color.startsWith('#')) {
		color = color.substring(1)
	}

	if (color.length === 3) {
		color = color.charAt(0) + color.charAt(0) + color.charAt(1) + color.charAt(1) + color.charAt(2) + color.charAt(2);
	} else if (color.length !== 6) {
		throw (new Error('Invalid hex color: ' + color));
	}

	let rgb = [];
	for (var i = 0; i <= 2; i++) {
		rgb[i] = parseInt(color.substr(i * 2, 2), 16);
	}

	return rgb;
}
function luma(color) {
	// color can be a hex string or an array of RGB values 0-255
	const rgb = (typeof color === 'string') ? hexToRGBArray(color) : color;
	return (0.2126 * rgb[0]) + (0.7152 * rgb[1]) + (0.0722 * rgb[2]); // SMPTE C, Rec. 709 weightings
}
function getContrastingColor(color) {
	// source: https://stackoverflow.com/questions/635022/calculating-contrasting-colours-in-javascript
	// exact answer: https://stackoverflow.com/a/6511606/2387277
	// example: https://jsfiddle.net/thomasrosen/9njo6t7s/20/

	return (luma(color) >= 165) ? '000' : 'fff';
}

const editButtonSVG = '<svg class="editButton" role="button" viewBox="0 0 24 24" width="16px" height="16px"><path d="M3 17.46v3.04c0 .28.22.5.5.5h3.04c.13 0 .26-.05.35-.15L17.81 9.94l-3.75-3.75L3.15 17.1c-.1.1-.15.22-.15.36zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>'
const deleteButtonSVG = '<svg class="deleteButton" role="button" viewBox="0 0 24 24" width="18px" height="18px"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v10zm3.17-7.83c.39-.39 1.02-.39 1.41 0L12 12.59l1.42-1.42c.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41L13.41 14l1.42 1.42c.39.39.39 1.02 0 1.41-.39.39-1.02.39-1.41 0L12 15.41l-1.42 1.42c-.39.39-1.02.39-1.41 0-.39-.39-.39-1.02 0-1.41L10.59 14l-1.42-1.42c-.39-.38-.39-1.02 0-1.41zM15.5 4l-.71-.71c-.18-.18-.44-.29-.7-.29H9.91c-.26 0-.52.11-.7.29L8.5 4H6c-.55 0-1 .45-1 1s.45 1 1 1h12c.55 0 1-.45 1-1s-.45-1-1-1h-2.5z"/></svg>'
const moveButtonSVG = '<svg class="moveButton" role="button" viewBox="0 0 24 24" width="18px" height="18px"><path d="M19 9H5c-.55 0-1 .45-1 1s.45 1 1 1h14c.55 0 1-.45 1-1s-.45-1-1-1zM5 15h14c.55 0 1-.45 1-1s-.45-1-1-1H5c-.55 0-1 .45-1 1s.45 1 1 1z"/></svg>'
const saveButtonSVG = '<svg class="saveButton" role="button" viewBox="0 0 24 24" width="20px" height="20px"><path d="M9 16.2l-3.5-3.5c-.39-.39-1.01-.39-1.4 0-.39.39-.39 1.01 0 1.4l4.19 4.19c.39.39 1.02.39 1.41 0L20.3 7.7c.39-.39.39-1.01 0-1.4-.39-.39-1.01-.39-1.4 0L9 16.2z"/></svg>'

async function deletePerson(personID){
	await friend_rank.deletePerson(personID)
	render_personList()
	render_rankingQuestion()
}

async function deleteQuestion(questionID){
	await friend_rank.deleteQuestion(questionID)
	render_questionList()
	render_rankingQuestion()
}

const friendBoundaries = {
	// SOURCE: https://ideas.ted.com/how-many-friends-do-most-people-dunbars-number/
	// NOTE: These are not real boundaries, but they are close enough to maybe be useful.

	0: '', // This is needed for the alogrithm to show the headings correctly.
	1: 'Special',
	5: 'Very Close Friends',
	15: 'Best Friends',
	50: 'Friends',
	150: 'Casual Friends',
	500: 'Acquaintances',
}
const friendBoundariesAmounts = Object.keys(friendBoundaries).map(key => parseInt(key))

function render_personList(){
	const personListElement = document.querySelector('#personList ol')

	let people = friend_rank.rankPeople()
	if (people.length > 0) {
		personListElement.innerHTML = ''
		let peopleSinceLastHeading = 0
		for (let personPosition = 0; personPosition < people.length; personPosition+=1) {
			const personEntry = people[personPosition]

			// add friend boundary headings
			let summedFriendBoundaryAmounts = 0
			for (let i = 0; i < friendBoundariesAmounts.length; i++) {
				const friendBoundariesAmount = friendBoundariesAmounts[i]
				summedFriendBoundaryAmounts += friendBoundariesAmount
				if (peopleSinceLastHeading === summedFriendBoundaryAmounts) {
					const friendBoundariesAmountNext = friendBoundariesAmounts[i + 1]
					if (friendBoundaries.hasOwnProperty(friendBoundariesAmountNext)) {
						const boundaryElement = document.createElement('h5')
						boundaryElement.classList.add('boundary')
						boundaryElement.innerHTML = `${friendBoundaries[friendBoundariesAmountNext]}`
						personListElement.appendChild(boundaryElement)
					}
				}
			}
			peopleSinceLastHeading += 1

			const hashtags_array = Array.isArray(personEntry.hashtags_array) ? personEntry.hashtags_array : []
			const hashtags_string = hashtags_array.join(', ')
			const hashtagElements = hashtags_array
				.sort((a, b) => a.localeCompare(b))
				.map(hashtag => {
					const hashtagColorHex = stringToColor(hashtag)
					const hashtagContrastingColorHex = '#' + getContrastingColor(hashtagColorHex)
					return `<div
						style="
							display: inline-block;
							opacity: 1;

							border-radius: 3px;
							border: 0px;
							color: ${hashtagContrastingColorHex};
							background: ${hashtagColorHex};
							outline: none;
							font: inherit;
							font-size: 0.8em;
							letter-spacing: -0.02em;
							font-weight: bold;

							white-space: nowrap;
							padding: 2px 4px;
							margin: 0 2px;

							width: 16px;
							height: 16px;
							border-radius: 50%;
						"
						title="${hashtag}"
					></div>`
				})
				.join('')

			const newPersonElement = document.createElement('li')
			newPersonElement.innerHTML = `
				<div class="oneRowStretch" style="cursor: pointer;">
					<div
						style="
							width: 100%;
							display: flex;
							flex-wrap: wrap;
							justify-content: space-between;
						"
						title="${personEntry.name}\n\n${hashtags_string}\n\nScore: ${Math.round(personEntry.score * 100)}"
					>
						${personEntry.name}
						${
							hashtags_array.length > 0
								? `<div style="flex-grow: 1; text-align: right;">${hashtagElements}</div>`
								: ''
						}
					</div>
					<!-- <span class="rankingInfos" style="opacity:${personEntry.opacity || 0};">${Math.round(personEntry.score*100)}</span> -->
				</div>
			`

			newPersonElement.addEventListener('click', ()=>{
				openPersonEditor(personEntry.personID)
			})

			personListElement.appendChild(newPersonElement)
		}
	}else{
		personListElement.innerHTML = '<em>no people yet</em>'
	}
}

function render_questionList() {
	// const questionListElement = document.querySelector('#questionList ul')

	let questions = Object.entries(friend_rank.questions)
	if (questions.length > 0) {
		questions = questions.sort((a, b) => {
			const n = b[1].position - a[1].position
			if (n !== 0) {
				return n
			}
			return a[1].timeAdded - b[1].timeAdded
		})

		questionListElement.innerHTML = ''
		for (const questionEntry of questions) {
			const questionID = questionEntry[0]
			const newQuestionElement = document.createElement('li')
			newQuestionElement.setAttribute('data-id', questionID)
			newQuestionElement.innerHTML = `
				<div class="view oneRowStretch">
					<div style="width: 100%;margin: 0 8px;">${questionEntry[1].question}</div>
					<div class="actionRow">
						${moveButtonSVG}
						${editButtonSVG}
						${deleteButtonSVG}
					</div>
				</div>
				<div class="edit oneRowStretch" style="display:none;" role="form">
					<textarea style="width: 100%;margin: -8px 0 4px 0;">${questionEntry[1].question}</textarea>
					<div class="actionRow">
						${saveButtonSVG}
					</div>
				</div>
			`

			const viewEle = newQuestionElement.querySelector('.view')
			const editEle = newQuestionElement.querySelector('.edit')

			const deleteButton = viewEle.querySelector('.deleteButton')
			deleteButton.addEventListener('click', ()=>deleteQuestion(questionID))

			const editButton = viewEle.querySelector('.editButton')
			editButton.addEventListener('click', ()=>{
				viewEle.style.display = 'none'
				editEle.style.display = 'flex'
				questions_removeSortable()
			})

			const saveButton = editEle.querySelector('.saveButton')
			saveButton.addEventListener('click', async ()=>{
				viewEle.style.display = 'flex'
				editEle.style.display = 'none'

				const textareaEle = editEle.querySelector('textarea')
				await friend_rank.updateQuestion(questionID, {
					...questionEntry[1],
					question: textareaEle.value,
				})
				render_questionList()
				render_rankingQuestion()
				questions_addSortable()
			})

			questionListElement.appendChild(newQuestionElement)
		}
	}else{
		questionListElement.innerHTML = '<em>no questions yet</em>'
	}
}

function render_rankingQuestion(){
	let people = Object.entries(friend_rank.people)

	// only show people with one of the filtered hashtags
	const filteredHashtags = friend_rank.getFilteredHashtags()
	if (filteredHashtags.size > 0) {
		people = people.filter(person => {
			if (Array.isArray(person[1].hashtags_array)) {
				const filteredArray = person[1].hashtags_array.filter(hashtag => filteredHashtags.has(hashtag))
				return filteredArray.length > 0
			}
			return false
		})
	}

	const questions = Object.entries(friend_rank.questions)

	const minPeople = 2
	const maxPeople = 4
	
	if (people.length >= minPeople && questions.length > 0) {
		document.querySelector('#personRanking').style.display = 'block'

		const questionEntry = questions[Math.floor(Math.random() * questions.length)]
		const questionForRankingElement = document.querySelector('#questionForRanking')
		questionForRankingElement.setAttribute('data-id', questionEntry[0])
		questionForRankingElement.innerHTML = questionEntry[1].question

		const peopleAmount = getRandomIntInclusive(minPeople, maxPeople)
		people = shuffle(people).slice(0, peopleAmount)

		const personRankingListElement = document.querySelector('#personRanking ol')
		personRankingListElement.innerHTML = ''
		for (const personEntry of people) {
			const newPersonElement = document.createElement('li')
			newPersonElement.setAttribute('data-id', personEntry[0])
			newPersonElement.innerHTML = `
				<div class="oneRowStretch">
					<div style="width: 100%;">${personEntry[1].name}</div>
					<div class="actionRow">
						${moveButtonSVG}
					</div>
				</div>
			`

			personRankingListElement.appendChild(newPersonElement)
		}
	}else{
		document.querySelector('#personRanking').style.display = 'none'
	}
}

function render_hashtagList() {
	const hashtags = friend_rank.getAllHashtags()
		.sort((a, b) => b.count - a.count)

	hashtags.unshift({
		hashtag: 'invert',
		count: 0,
		active: false,
	})
	hashtags.unshift({
		hashtag: 'none',
		count: 0,
		active: false,
	})

	const hashtagListElement = document.querySelector('#hashtagSelector')
	// document.querySelector('#hashtagSelector').style.display = 'block'

	hashtagListElement.innerHTML = ''
	// display a list of hashtags as buttons with the count on the right side
	for (const hashtag of hashtags) {
		const newHashtagElement = document.createElement('button')

		const hashtagColorHex = stringToColor(hashtag.hashtag)
		newHashtagElement.style.backgroundColor = hashtagColorHex
		newHashtagElement.style.color = '#' + getContrastingColor(hashtagColorHex)
		newHashtagElement.style.margin = '4px'
		newHashtagElement.style.fontWeight = 'bold'

		if (hashtag.active) {
			newHashtagElement.classList.add('active')
		}
		
		newHashtagElement.setAttribute('data-hashtag', hashtag.hashtag)
		if (hashtag.count > 1) {
			newHashtagElement.innerHTML = `
				<span>${hashtag.hashtag}</span>
				<span class="count">${hashtag.count}</span>
			`
		} else {
			newHashtagElement.innerHTML = `
				<span>${hashtag.hashtag}</span>
			`
		}
		newHashtagElement.addEventListener('click', ()=>{
			const hashtag = newHashtagElement.getAttribute('data-hashtag')
			friend_rank.toggleHashtagFilter(hashtag)
			render()
		})
		hashtagListElement.appendChild(newHashtagElement)
	}
}

function openPersonEditor(personID){
	render_personEditor(personID)
	const personEditor = document.querySelector('#personEditor')
	personEditor.removeAttribute('hidden')
}
function exitPersonEditor(){
	const personEditor = document.querySelector('#personEditor')
	personEditor.setAttribute('hidden', 'hidden')
}
const socials = {
	instagram: 'Instagram',
	twitter: 'Twitter',
	github: 'GitHub',
	facebook: 'Facebook',
}
function render_personEditor(personID){
	const personDoc = friend_rank.people[personID] || {}

	const personIDElement = document.querySelector('#personEditor [name="personID"]')
	personIDElement.value = personID

	const nameElement = document.querySelector('#personEditor [name="name"]')
	nameElement.value = personDoc.name || ''

	const birthdayElement = document.querySelector('#personEditor [name="birthday"]')
	birthdayElement.value = personDoc.birthday || ''

	const notesElement = document.querySelector('#personEditor [name="notes"]')
	notesElement.value = personDoc.notes || ''

	let socialsValues = personDoc.socials || {}
	let socialsHTML = ''
	for (const socialsEntry of Object.entries(socials)) {
		socialsHTML += `
			<label class="oneRowStretch middle">
				<span class="label">${socialsEntry[1]}:</span>
				<input value="${socialsValues[socialsEntry[0]] || ''}" name="${socialsEntry[0]}" type="text" style="margin-right: 0;"/>
			</label>
		`
	}
	const socialsElement = document.querySelector('#personEditor #socials')
	socialsElement.innerHTML = socialsHTML

	const deleteButton = document.querySelector('#personEditor #deleteButton')
	deleteButton.addEventListener('click', ()=>{
		deletePerson(personID)
		exitPersonEditor()
	})

	// listen for esc key and close editor
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			exitPersonEditor()
		}
	})
}
function getHashtags(text) {
	const hashtags = text
		.toLowerCase()
		.replace('ö', 'oe')
		.replace('ü', 'ue')
		.replace('ä', 'ae')
		.match(/#\w+/giu) // find hashtags
		.map(tag => tag.substring(1)) // remove #
	return hashtags
}
async function savePersonEditor(){
	let newDoc = {}

	const personIDElement = document.querySelector('#personEditor [name="personID"]')
	const personID = personIDElement.value

	const nameElement = document.querySelector('#personEditor [name="name"]')
	newDoc.name = nameElement.value

	const birthdayElement = document.querySelector('#personEditor [name="birthday"]')
	newDoc.birthday = birthdayElement.value

	const notesElement = document.querySelector('#personEditor [name="notes"]')
	const new_note = notesElement.value
	newDoc.notes = new_note
	newDoc.hashtags_array = getHashtags(new_note).map(hashtag => hashtag.toLowerCase())

	let socialsValues = {}
	for (const socialsEntry of Object.entries(socials)) {
		const socialName = socialsEntry[0]

		const socialElement = document.querySelector('#personEditor [name="'+socialName+'"]')
		if (socialElement.value !== '') {
			socialsValues[socialName] = socialElement.value
		}
	}
	newDoc.socials = socialsValues

	await friend_rank.updatePerson(personID, newDoc)
	render_personList()
	render_rankingQuestion()
	render_hashtagList()
	exitPersonEditor()
}

async function addPerson(){
	const textField = document.querySelector('#addPerson input[name="name"]')
	const value = textField.value
	if (value !== '') {
		await friend_rank.addPerson({
			name: value,
			timeAdded: new Date()*1,
		})
		textField.value = ''
		render_personList()
	}
}
async function addQuestion(){
	const textField = document.querySelector('#addQuestion textarea[name="question"]')
	const value = textField.value
	if (value !== '') {
		await friend_rank.addQuestion({
			question: value,
			position: 1,
			timeAdded: new Date()*1,
		})
		textField.value = ''
		render_questionList()
		render_rankingQuestion()
	}
}

async function savePersonRanking(){
	const questionForRankingElement = document.querySelector('#questionForRanking')
	const questionID = questionForRankingElement.getAttribute('data-id')

	const sortedPersonIDs = personRankingSortable.toArray()
	await friend_rank.addAnswer({
		questionID,
		sortedPersonIDs,
		timeAdded: new Date()*1,
	})

	render_personList()
	render_rankingQuestion()
}
function saveQuestionsRanking(){
	const sortedQuestionIDs = questionSortable.toArray()
	const stepLength = 1/sortedQuestionIDs.length
	let currentPosition = 1
	for (const questionID of sortedQuestionIDs) {
		friend_rank.updateQuestion(questionID, {
			...friend_rank.questions[questionID],
			position: currentPosition,
		})
		currentPosition -= stepLength
	}

	render_personList()
}

function downloadJSON(filename, mimeType, encodedData) {
	const download_a_tag = document.querySelector('#dowloadTrigger')
	download_a_tag.download = filename
	download_a_tag.href = `data:${mimeType};base64,${encodedData}`
	download_a_tag.click()
}
function base64EncodeUnicode(str) {
	// SOURCE: https://www.base64encoder.io/javascript/
	// First we escape the string using encodeURIComponent to get the UTF-8 encoding of the characters, 
	// then we convert the percent encodings into raw bytes, and finally feed it to btoa() function.
	utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
		return String.fromCharCode('0x' + p1)
	})

	return btoa(utf8Bytes)
}
function exportEverything(){
	const data = friend_rank.exportEverything()

	const ISOdateString = new Date(data.metadata.timeExported)
	.toISOString()
	.replace(/[:.]/g, '-')

	downloadJSON(`full-export-${ISOdateString}.friends.json`, 'application/json', base64EncodeUnicode(JSON.stringify(data,null,'\t')))
}
function importBackup(fileList){
	if (fileList < 1) {
		alert('No file provided.')
	}

	const file = fileList[0]

	// Check if the file is a text or json file. 
	if (
		!(!!file.type)
		|| (
			!!file.type
			&& (
				file.type.indexOf('text') !== -1
				|| file.type.indexOf('json') !== -1
			)
		)
	) {
		const reader = new FileReader({
			encoding: 'utf-8',
		})
		reader.addEventListener('load', async event => {
			await friend_rank.import(JSON.parse(event.target.result))
			render()
		})
		reader.readAsText(file, 'utf-8')
	}else{
		alert('Please use a .friends.json file.')
	}
}
function init_importBackup(){

	const importBackupElement = document.querySelector('#importBackup')

	const fileInputElement = importBackupElement.querySelector('input[type="file"]')
	fileInputElement.addEventListener('change', (event) => {
		const fileList = event.target.files;
		importBackup(fileList)
	})
	
	importBackupElement.addEventListener('dragover', (event) => {
		event.stopPropagation()
		event.preventDefault()
		// Style the drag-and-drop as a "copy file" operation.
		event.dataTransfer.dropEffect = 'copy'
		importBackupElement.classList.add('focus')
	})
	
	importBackupElement.addEventListener('drop', (event) => {
		event.stopPropagation()
		event.preventDefault()
		const fileList = event.dataTransfer.files
		importBackup(fileList)
		importBackupElement.classList.remove('focus')
	})
	
	importBackupElement.addEventListener('dragend', (event) => {
		importBackupElement.classList.remove('focus')
	})
	importBackupElement.addEventListener('dragleave', (event) => {
		importBackupElement.classList.remove('focus')
	})
}
function openImportFileInput(event){
	const fileInputElement = document.querySelector('#importBackup input[type="file"]')
	fileInputElement.click()
}


var friend_rank,
personRankingListElement, personRankingSortable,
questionListElement, questionSortable

function render(){
	render_personList()
	render_questionList()
	render_rankingQuestion()
	render_hashtagList()
}
function questions_addSortable(){
	questionSortable = Sortable.create(questionListElement, {
		onEnd: () => saveQuestionsRanking(),
	})
	questionListElement.classList.add('sortable')
}
function questions_removeSortable(){
	questionSortable.destroy()
	questionListElement.classList.remove('sortable')
}
function start(){
	friend_rank = new FriendRank()

	personRankingListElement = document.querySelector('#personRanking ol')
	personRankingSortable = Sortable.create(personRankingListElement)

	questionListElement = document.querySelector('#questionList ol')
	questions_addSortable()

	render()
	init_importBackup()
}

window.addEventListener('load', ()=>{
	start()
})
