function MemoButtonImportRequest()
{
    this.init();
}

MemoButtonImportRequest.prototype = {

    frameId : null,
    link : null,
    auth : null,

    init : function()
    {
        this.memoUrl = "https://memo.pole-emploi.fr/";

        if(window.location.hostname.indexOf('beta')>=0)
            this.memoUrl = "https://memo.beta.pole-emploi.fr/";
        else if(window.location.hostname.indexOf('boomerang')>=0)
            this.memoUrl = "http://boomerang:8080/";

        this.parser = new Parser();

        this.importActive = 1;

        this.initFrameMessageListener();

        // début des échanges via postMessage avec le parent
        this.getIdentityFromParent();
    },

    getIdentityFromParent : function()  // requiert un nom de la part du parent
    {
        var p = {type:"sendIdentity"};

        this.link = Math.random();
        p.link = this.link;             // link sert de code de contrôle pour s'assurer que le message reçu est bien destiné à cette frame

        window.parent.postMessage(p,"*");
    },

    getParametersFromParent : function()    // reqiuert les paramètres du bouton de la part du parent
    {
        var p = {type:"sendParameters",id:this.frameId};

        window.parent.postMessage(p,"*");
    },

    initFrameMessageListener : function()
    {
        window.addEventListener('message',function(e)
        {
            //console.log("receiveParameters OK "+ e.data, e);
            //console.log("mBIR réception message ",e, e.data);

            var t = memoButtonImportRequest;

            if(e.data.type=="identity") // reçoit son identité.
            {
                if(e.data.link==t.link) // link permet d'éliminer les messages destinés à une autre frame
                {
                    t.frameId = e.data.id;

                    t.getParametersFromParent();    // la frame connait maintenant son nom, elle demande le reste des paramètres
                }
            }
            else if(e.data.type=="keyboardClick")   // reçoit un ordre de click
            {
                //console.log("- keyboardClick reçu -",e.data);
                if(t.id== e.data.id && t.importActive)
                {
                    //console.log("OK");
                    if(t.auth)
                        t.importOffre();
                    else
                        t.openMemo();
                }
                /*else
                 console.log("PAS OK", t.id, e.data.id, t.importActive);*/
            }
            else    // l'autre type de message possible concerne la fixation des paramètres de la frame
            {
                t.url = $sc(e.data.url);
                if(e.data.size && e.data.size!="null")
                    t.size = $sc(e.data.size);
                if(e.data.jobTitle && e.data.jobTitle!="null")
                    t.jobTitle = $sc(e.data.jobTitle);
                if(e.data.id && e.data.id!="null")
                    t.id = $sc(e.data.id);
                if(e.data.idOffre && e.data.idOffre!="null")
                    t.idOffre = $sc(e.data.idOffre);

                t.setSize();
                t.prepareUrl();
                t.initButton();
            }
        })
    },

    // fixe la taille des boutons selon la page
    setSize : function()
    {
        if(this.size && this.size=="detail")
            this.size="detail"; // page standalone
        else
            this.size="regular";    // page standard
        document.body.className=this.size;
    },

    prepareUrl : function()
    {
        var u = this.url;
        u = decodeURIComponent(u);

        u.replace(/\s/gi,'+');

        u = u.trim();

        if(u.toLowerCase().indexOf("http")!=0)
            u = "http://"+ u;

        this.url = u;
    },

    initButton : function()
    {
        this.auth = this.getCookie("auth");

        if(this.auth)
        {
            document.body.addEventListener('click',function(e) {
                var t = memoButtonImportRequest;
                if(t.importActive)
                    t.importOffre();
            });

            this.activate(this.id);
        }
        else
        {
            document.body.addEventListener('click',function(e) {
                memoButtonImportRequest.openMemo();
            });

            this.activate(this.id);
        }
    },

    openMemo : function()
    {
        var p = "url="+this.url+"&utm_campaign=boutonPe&utm_source=pole-emploi.fr&utm_medium=referral";

        if(this.jobTitle)
            p+="&jobTitle="+ Url.encode(this.jobTitle);

        if(this.idOffre)
            p+="&idOffre="+ Url.encode(this.idOffre);

        this.setButtonState("success");

        this.importActive = 0;

        window.open(this.memoUrl+"?"+p,"memo", this.getWindowParameters());

        ga('send', { hitType : 'event', eventCategory : 'ImportButton', eventAction : 'openMemo', eventLabel : 'Pôle Emploi' });
    },

    getWindowParameters : function()    // retourne les paramètres d'ouverture de la fenêtre
    {
        //var res = "", ww = parent.window.innerWidth, wh = parent.window.innerHeight;  // la taille du parent est une propriété protégée
        var res = "", ww = screen.width, wh = screen.height, l;

        if(ww>800)
        {
            l = Math.round((ww-600)/2);
            res = "left="+l+",top=180,height=600,width=600,directories=no,toolbar=no,status=no,scrollbars=yes,personalbar=no";
        }

        return res;
    },

    saveCandidature : function(c)
    {
        var nC = c.nomCandidature,
            nS = c.nomSociete,
            ville = c.ville,
            nomC = c.nomContact,
            emailC = c.emailContact,
            telC = c.telContact,
            p, v, ok = true;

        c.etat = 0;

        if(!c.type)
            c.type = 2;

        if(!nC)
        {
            ok = false;
        }
        else
        {
            if (nC)
            {
                nC = nC.substring(0, 128);
                c.nomCandidature = nC;
            }

            if (nS)
            {
                nS = nS.substring(0, 128);
                c.nomSociete = nS;
            }

            if (ville)
            {
                ville = ville.substring(0, 255);
                c.ville = ville;
            }

            if (nomC)
            {
                nomC = nomC.substring(0, 255);
                c.nomContact = nomC;
            }

            if (emailC)
            {
                emailC = emailC.substring(0, 128);
                c.emailContact = emailC;
            }

            if (telC)
            {
                telC = telC.substring(0, 24);
                c.telContact = telC;
            }
        }

        if(ok)
        {
            p = c.getQParam()+"isButton=1";

            $.ajax({
                type: 'POST',
                url: this.memoUrl+'rest/candidatures/importFrom',
                data: p,
                dataType: "json",

                success: function (response)
                {
                    if(response.result=="ok")
                    {
                        memoButtonImportRequest.setButtonState("success");
                        localStorage.setItem("refreshBoardAfterImport",1);
                        ga('send', { hitType : 'event', eventCategory : 'ImportButton', eventAction : 'offreEnregistree', eventLabel : 'Pôle Emploi' });
                    }
                    else if(response.result=="doublon")
                    {
                        memoButtonImportRequest.setButtonState("doublon");
                        ga('send', { hitType : 'event', eventCategory : 'ImportButton', eventAction : 'doublon', eventLabel : 'Pôle Emploi' });
                    }
                    else if(response.msg=="userAuth")
                    {
                        memoButtonImportRequest.setButtonState("");
                        memoButtonImportRequest.openMemo();
                        ga('send', { hitType : 'event', eventCategory : 'ImportButton', eventAction : 'authExpired', eventLabel : 'Pôle Emploi' });
                    }
                    else
                    {
                        memoButtonImportRequest.setButtonState("error");
                        ga('send', { hitType : 'event', eventCategory : 'ImportButton', eventAction : 'saveError', eventLabel : 'Pôle Emploi' });
                    }
                },
                error: function (jqXHR, textStatus, errorThrown)
                {
                    ga('send', { hitType : 'event', eventCategory : 'ImportButton', eventAction : 'saveError2', eventLabel : 'Pôle Emploi' });
                    memoButtonImportRequest.setButtonState("error");
                }
            });

            memoButtonImportRequest.parser.logUrlToGA(c);

            // geler la possibilité de cliquer sur le bouton --> Supprimer l'event, changer la css pour avoir un rond barré

        }
        else
            ga('send', { hitType : 'event', eventCategory : 'ImportButton', eventAction : 'parseError', eventLabel : 'Pôle Emploi' });
    },

    importOffre : function()
    {
        var t=this,
            p = "url="+ Url.encode(t.url);

        if(t.idOffre)
            p +="&idOffre="+Url.encode(t.idOffre);

        t.importActive = 0;

        t.setButtonState("loading");

        $.ajax({
            type: 'POST',
            url: t.memoUrl+'rest/candidatures/offre',
            data : p,
            dataType: "html",

            success: function (response)
            {
                var json, html,
                    t = memoButtonImportRequest;

                if(response=="error")
                {
                    t.setButtonState("error");

                    ga('send', { hitType : 'event', eventCategory : 'ImportButton', eventAction : 'importError', eventLabel : 'Pôle Emploi' });
                }
                else
                {
                    t.setButtonState("success");
                    html = $sc(response);

                    try
                    {
                        json = JSON.parse(html);
                    }
                    catch (err) { }

                    var c = t.parser.parseOffre(html, t.url);
                    if(!c.urlSource)
                        c.urlSource = t.url;

                    // tentative de récupération du logo
                    var tO = 0;
                    if (!c.logoUrl && c.nomSociete)
                    {
                        tO = 100;
                        $.getJSON('https://autocomplete.clearbit.com/v1/companies/suggest', { query: c.nomSociete }, function(data)
                        {
                            if(data && data.length>0)
                            {
                                var u = data[0].logo;
                                c.logoUrl=u;
                            }
                        });
                    }

                    setTimeout(function () {
                        memoButtonImportRequest.saveCandidature(c);
                    }, tO);
                }
            },
            error: function (jqXHR, textStatus, errorThrown)
            {
                // gestion d'erreur : ajouter un message dans un div sur le formulaire de création de compte
                memoButtonImportRequest.setButtonState("error");
                ga('send', { hitType : 'event', eventCategory : 'ImportButton', eventAction : 'importError2', eventLabel : 'Pôle Emploi' });
            }
        });

        ga('send', { hitType : 'event', eventCategory : 'ImportButton', eventAction : 'importOffre', eventLabel : 'Pôle Emploi' });
    },

    setButtonState : function(state)
    {
        document.getElementsByTagName("body")[0].className= state+" "+this.size;

        if(!state)
        {
            this.setParentTooltip("Enregistrer dans MEMO");
        }
        else if(state=="loading")
        {
            this.setParentTooltip("Enregistrement en cours");
        }
        else if(state=="error")
        {
            this.setParentTooltip("Service momentanément indisponible");
        }
        else if(state=="success")
        {
            this.setParentTooltip("Enregistré dans MEMO");
        }
        else if(state=="doublon")
        {
            this.setParentTooltip("Vous avez déjà enregistré cette candidature dans MEMO");
        }
    },

    getCookie: function(cname)
    {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for(var i = 0; i <ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0)==' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length,c.length);
            }
        }
        return "";
    },

    setParentTooltip : function(tooltip)
    {
        var p = {type:"setTooltip",id:this.frameId,tooltip:tooltip};
        window.parent.postMessage(p,"*");
    },

    activate : function(id)
    {
        this.frameId = id;
        var p = {type:"setStyle",styleClass:""};
        window.parent.postMessage(p,"*");
    }
}

var memoButtonImportRequest = new MemoButtonImportRequest();


(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-77025427-2', 'auto');
ga('send', { hitType : 'event', eventCategory : 'ImportButton', eventAction : 'display', eventLabel : 'Pôle Emploi' });