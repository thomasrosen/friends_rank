
class FriendRank {

	people = store.get('people') || {}
	questions = store.get('questions') || {}
	answers = store.get('answers') || []

	/*
		STRUCTURE:

		people = {
			'personID': {
				name: String,
				timeAdded: Number,
				// hidden: Boolean,

				birthday: String, // ISO standard. Unkown parts are in underscores.
				birthday_ts: Number, // Best timestamp estimate for the birthday-string.

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
				
				people[personID].score += currentRank * questionWeight
				people[personID].count += 1

				currentRank -= stepLength
			}

			return people
		}, {})

		people = Object.entries(people)

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
			timeAdded: this.people[personEntry[0]].timeAdded,
		}))

		const rankedPeopleIDs = people.map(person => person.personID)

		for (const personEntry of Object.entries(this.people)) {
			if (!rankedPeopleIDs.includes(personEntry[0])) {
				people.push({
					personID: personEntry[0],
					score: 0,
					name: personEntry[1].name,
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

		return people
	}

	exportEverything(){
		return {
			metadata: {
				timeExported: new Date()*1,
			},
			people: this.people,
			questions: this.questions,
			answers: this.answers,
		}
	}
	import(object){
		return new Promise(async (resolve)=>{
			this.people = object.people || {}
			this.questions = object.questions || {}
			this.answers = object.answers || []
			await this.saveData()
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

function render_personList(){
	const personListElement = document.querySelector('#personList ol')

	let people = friend_rank.rankPeople()
	if (people.length > 0) {
		personListElement.innerHTML = ''
		for (const personEntry of people) {
			const newPersonElement = document.createElement('li')
			newPersonElement.innerHTML = `
				<div class="oneRowStretch" style="cursor: pointer;">
					<div style="width: 100%;">${personEntry.name}</div>
					<span class="rankingInfos" style="opacity:${personEntry.opacity || 0};">${Math.round(personEntry.score*100)}</span>
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

function render_questionList(){
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
	const personDoc = friend_rank.people[personID] || {}

	const personIDElement = document.querySelector('#personEditor [name="personID"]')
	personIDElement.value = personID

	const nameElement = document.querySelector('#personEditor [name="name"]')
	nameElement.value = personDoc.name || ''

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
}
async function savePersonEditor(){
	let newDoc = {}

	const personIDElement = document.querySelector('#personEditor [name="personID"]')
	const personID = personIDElement.value

	const nameElement = document.querySelector('#personEditor [name="name"]')
	newDoc.name = nameElement.value

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
		render_rankingQuestion()
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

	questionListElement = document.querySelector('#questionList ul')
	questions_addSortable()

	render()
	init_importBackup()
}

window.addEventListener('load', ()=>{
	start()
})
