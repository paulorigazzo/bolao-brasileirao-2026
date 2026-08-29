function safeCount(value){
  const number=Number(value);
  return Number.isFinite(number)?Math.max(0,Math.round(number)):0;
}

function plural(value,singular,pluralForm=`${singular}s`){
  return `${value} ${value===1?singular:pluralForm}`;
}

export function buildMyTeamMoment({
  teamName="seu time",games=0,points=0,hits=0,exact=0,accuracy=0,confidence=0,
  currentSequence=0,latestEarned=0,latestExact=false,predictedWins=0,
  recentClubPoints=0,recentClubGames=0,nextPickLabel="",referenceRound=0
}={}){
  const analyzed=safeCount(games),totalPoints=safeCount(points),correct=safeCount(hits),exactScores=safeCount(exact);
  const reading=Math.max(0,Math.min(100,safeCount(accuracy))),trust=Math.max(0,Math.min(100,safeCount(confidence)));
  const streak=safeCount(currentSequence),winsPredicted=Math.min(analyzed,safeCount(predictedWins));
  const recentGames=safeCount(recentClubGames),clubPoints=safeCount(recentClubPoints),next=String(nextPickLabel||"").trim();
  const choose=options=>options[safeCount(referenceRound)%options.length];
  let icon="🌱",title="Uma história para começar",text=`O primeiro palpite concluído com o ${teamName} vai inaugurar este capítulo.`;

  if(analyzed>0 && latestExact){
    icon="🎯"; title="Roteiro nas mãos";
    text=choose([`Placar exato no jogo mais recente do ${teamName}. Por 90 minutos, você parecia ter acesso ao roteiro.`,`Você cravou o placar mais recente do ${teamName}. A bola e o palpite finalmente falaram a mesma língua.`]);
  }else if(analyzed>0 && streak>=3){
    icon="🔥"; title="Entrosamento em alta";
    text=choose([`Você pontuou em ${plural(streak,"jogo")} seguido${streak===1?"":"s"} do ${teamName}. Já dá para desconfiar que acompanha até o treino fechado.`,`São ${plural(streak,"jogo")} pontuando em sequência com o ${teamName}. O entrosamento deixou de ser coincidência.`]);
  }else if(analyzed>0 && correct===1 && Number(latestEarned)>0){
    icon="🙌"; title="Finalmente saiu o entrosamento";
    text=choose([`Você leu o jogo mais recente e o ${teamName} confirmou em campo. Agora existe uma parceria para defender.`,`O primeiro acerto com o ${teamName} saiu. Parece que a prancheta finalmente encontrou o gramado.`]);
  }else if(analyzed>0 && trust>=70 && reading<50){
    icon="😅"; title="Sintonia em fase de ajuste";
    text=choose([`Você apostou na vitória do ${teamName} em ${winsPredicted} dos últimos ${plural(analyzed,"jogo analisado","jogos analisados")}, mas o clube ainda não colaborou com a leitura.${next?` O próximo ${next} já está registrado — vai que agora encaixa.`:" O coração segue escalado como titular."}`,`A confiança no ${teamName} entrou em campo ${winsPredicted} vezes, mas a estatística ainda está no banco.${next?` O próximo ${next} pode mudar a escalação.`:" A torcida, claro, continua titular."}`]);
  }else if(analyzed>0 && totalPoints===0){
    icon="🧩"; title="O passe ainda não encaixou";
    text=choose([`Você já acompanhou ${plural(analyzed,"jogo")} do ${teamName} por aqui. A estatística ainda está tentando alcançar a torcida.`,`O coração já entrou em campo em ${plural(analyzed,"jogo")}. Os pontos só estão fazendo um aquecimento mais demorado.`]);
  }else if(analyzed>0 && recentGames>=3 && clubPoints<=Math.floor(recentGames*.6)){
    icon="🛡️"; title="Firme na arquibancada";
    text=choose([`A fase recente do ${teamName} exige paciência, mas abandonar o escudo agora nem passou pela cabeça.`,`O ${teamName} anda testando a paciência da arquibancada. Você segue por perto, porque torcida não pede substituição.`]);
  }else if(analyzed>0){
    icon=exactScores?"✨":"⚽"; title="Conexão em construção";
    text=choose([`Entre palpites e resultados, sua história com o ${teamName} já soma ${plural(totalPoints,"ponto")}. Cada rodada traz uma nova leitura.`,`Sua parceria com o ${teamName} continua em construção: ${plural(totalPoints,"ponto")} e assunto garantido para a próxima rodada.`]);
  }

  return {icon,title,text,indicators:[plural(analyzed,"jogo analisado","jogos analisados"),`${trust}% de confiança`,plural(totalPoints,"ponto")]};
}

export function buildMyTeamAchievements({teamName="seu time",games=0,exact=0,bestSequence=0,accuracy=0}={}){
  const analyzed=safeCount(games),exactScores=safeCount(exact),sequence=safeCount(bestSequence);
  const reading=Math.max(0,Math.min(100,safeCount(accuracy)));
  const progress=(current,target)=>Math.min(100,Math.round(Math.min(current,target)/target*100));
  const fineUnlocked=analyzed>=5 && reading>=70;
  const fineProgress=fineUnlocked?100:Math.min(99,Math.round((Math.min(analyzed,5)/5*.5+Math.min(reading,70)/70*.5)*100));
  return [
    {id:"first",icon:"📖",title:"Primeiro capítulo",text:`Registrou o primeiro palpite concluído com o ${teamName}.`,unlocked:analyzed>=1,progress:progress(analyzed,1),progressLabel:`${Math.min(analyzed,1)}/1 jogo`},
    {id:"specialist",icon:"🏅",title:"Especialista do Clube",text:`Palpite em cinco jogos concluídos do ${teamName}.`,unlocked:analyzed>=5,progress:progress(analyzed,5),progressLabel:`${Math.min(analyzed,5)}/5 jogos`},
    {id:"prophet",icon:"🎯",title:"Profeta",text:"Dois placares exatos envolvendo seu time.",unlocked:exactScores>=2,progress:progress(exactScores,2),progressLabel:`${Math.min(exactScores,2)}/2 placares exatos`},
    {id:"reader",icon:"🔥",title:"Leitor de Momento",text:"Pontos em três jogos consecutivos do clube.",unlocked:sequence>=3,progress:progress(sequence,3),progressLabel:`${Math.min(sequence,3)}/3 jogos consecutivos`},
    {id:"fine",icon:"🧠",title:"Sintonia Fina",text:"Pelo menos 70% de leitura correta em cinco ou mais jogos.",unlocked:fineUnlocked,progress:fineProgress,progressLabel:`${Math.min(analyzed,5)}/5 jogos • ${reading}% de acerto`}
  ];
}
