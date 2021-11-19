define(['d3'], function () {
    "use strict";

    /**
     * @class ControlBox
     * @constructor
     */
    function ControlBox(config) {
        this.historyView = config.historyView;
        this.originView = config.originView;
        this.initialMessage = config.initialMessage || 'Digite os comandos git abaixo.';
        this._commandHistory = [];
        this._currentCommand = -1;
        this._tempCommand = '';
        this.rebaseConfig = {}; // configurar os branches para rebase
    }

    ControlBox.prototype = {
        render: function (container) {
            var cBox = this,
                cBoxContainer, log, input;

            cBoxContainer = container.append('div')
                .classed('control-box', true);


            log = cBoxContainer.append('div')
                .classed('log', true);

            input = cBoxContainer.append('input')
                .attr('type', 'text')
                .attr('placeholder', 'digite o comando git');

            input.on('keyup', function () {
                var e = d3.event;

                switch (e.keyCode) {
                case 13:
                    if (this.value.trim() === '') {
                        break;
                    }

                    cBox._commandHistory.unshift(this.value);
                    cBox._tempCommand = '';
                    cBox._currentCommand = -1;
                    cBox.command(this.value);
                    this.value = '';
                    e.stopImmediatePropagation();
                    break;
                case 38:
                    var previousCommand = cBox._commandHistory[cBox._currentCommand + 1];
                    if (cBox._currentCommand === -1) {
                        cBox._tempCommand = this.value;
                    }

                    if (typeof previousCommand === 'string') {
                        cBox._currentCommand += 1;
                        this.value = previousCommand;
                        this.value = this.value; // definir o cursor para o fim
                    }
                    e.stopImmediatePropagation();
                    break;
                case 40:
                    var nextCommand = cBox._commandHistory[cBox._currentCommand - 1];
                    if (typeof nextCommand === 'string') {
                        cBox._currentCommand -= 1;
                        this.value = nextCommand;
                        this.value = this.value; // definir o cursor para o fim
                    } else {
                        cBox._currentCommand = -1;
                        this.value = cBox._tempCommand;
                        this.value = this.value; // definir o cursor para o fim
                    }
                    e.stopImmediatePropagation();
                    break;
                }
            });

            this.container = cBoxContainer;
            this.log = log;
            this.input = input;

            this.info(this.initialMessage);
        },

        destroy: function () {
            this.log.remove();
            this.input.remove();
            this.container.remove();

            for (var prop in this) {
                if (this.hasOwnProperty(prop)) {
                    this[prop] = null;
                }
            }
        },

        _scrollToBottom: function () {
            var log = this.log.node();
            log.scrollTop = log.scrollHeight;
        },

        command: function (entry) {
            if (entry.trim === '') {
                return;
            }

            var split = entry.split(' ');

            this.log.append('div')
                .classed('command-entry', true)
                .html(entry);

            this._scrollToBottom();

            if (split[0] !== 'git') {
                return this.error();
            }

            var method = split[1],
                args = split.slice(2);

            try {
                if (typeof this[method] === 'function') {
                    this[method](args);
                } else {
                    this.error();
                }
            } catch (ex) {
                var msg = (ex && ex.message) ? ex.message: null;
                this.error(msg);
            }
        },

        info: function (msg) {
            this.log.append('div').classed('info', true).html(msg);
            this._scrollToBottom();
        },

        error: function (msg) {
            msg = msg || 'Eu não consegui entender isso.';
            this.log.append('div').classed('error', true).html(msg);
            this._scrollToBottom();
        },

        commit: function (args) {
            if (args.length >= 2) {
                var arg = args.shift();

                switch (arg) {
                    case '-m':
                        var message = args.join(" ");
                        this.historyView.commit({},message);
                        break;
                    default:
                        this.historyView.commit();
                        break;
                }
            } else {
                this.historyView.commit();
            }
        },

        branch: function (args) {
            if (args.length < 1) {
                this.info(
                    'Você precisa fornecer um nome de branch. ' +
                    'Normalmente, se você não der um nome, ' +
                    'este comando irá listar seus branches locais na tela.'
                );

                return;
            }

            while (args.length > 0) {
                var arg = args.shift();

                switch (arg) {
                case '--remote':
                case '-r':
                    this.info(
                        'Este comando normalmente exibe todos os seus branches de rastreamento remoto.'
                    );
                    args.length = 0;
                    break;
                case '--all':
                case '-a':
                    this.info(
                        'Este comando normalmente exibe todos os seus ramos de rastreamento, remotos e locais.'
                    );
                    break;
                case '--delete':
                case '-d':
                    var name = args.pop();
                    this.historyView.deleteBranch(name);
                    break;
                default:
                    if (arg.charAt(0) === '-') {
                        this.error();
                    } else {
                        var remainingArgs = [arg].concat(args);
                        args.length = 0;
                        this.historyView.branch(remainingArgs.join(' '));
                    }
                }
            }
        },

        checkout: function (args) {
            while (args.length > 0) {
                var arg = args.shift();

                switch (arg) {
                case '-b':
                    var name = args[args.length - 1];
                    try {
                        this.historyView.branch(name);
                    } catch (err) {
                        if (err.message.indexOf('já existe') === -1) {
                            throw new Error(err.message);
                        }
                    }
                    break;
                default:
                    var remainingArgs = [arg].concat(args);
                    args.length = 0;
                    this.historyView.checkout(remainingArgs.join(' '));
                }
            }
        },

        tag: function (args) {
            if (args.length < 1) {
                this.info(
                    'Você precisa dar um nome de tag. ' +
                    'Normalmente, se você não der um nome, ' +
                    'este comando irá listar suas tags locais na tela.'
                );

                return;
            }
            
            while (args.length > 0) {
                var arg = args.shift();

                try {
                    this.historyView.tag(arg);
                } catch (err) {
                    if (err.message.indexOf('já existe') === -1) {
                        throw new Error(err.message);
                    }
                }
            }
        },

        reset: function (args) {
            while (args.length > 0) {
                var arg = args.shift();

                switch (arg) {
                case '--soft':
                    this.info(
                        'A flag "--soft" funciona no git real, mas ' +
                        'Eu não posso mostrar como funciona nesta demonstração. ' +
                        'Em vez disso, vou apenas mostrar como "--hard" se apresenta.'
                    );
                    break;
                case '--mixed':
                    this.info(
                        'A flag "--mixed" funciona no git real, mas ' +
                        'Eu não posso mostrar como funciona nesta demonstração.'
                    );
                    break;
                case '--hard':
                    this.historyView.reset(args.join(' '));
                    args.length = 0;
                    break;
                default:
                    var remainingArgs = [arg].concat(args);
                    args.length = 0;
                    this.info('Assumindo "--hard".');
                    this.historyView.reset(remainingArgs.join(' '));
                }
            }
        },

        clean: function (args) {
            this.info('Excluindo todos os seus arquivos não rastreados...');
        },

        revert: function (args) {
            this.historyView.revert(args.shift());
        },

        merge: function (args) {
            var noFF = false;
            var branch = args[0];
            if (args.length === 2)
            {
                if (args[0] === '--no-ff') {
                    noFF = true;
                    branch = args[1];
                } else if (args[1] === '--no-ff') {
                    noFF = true;
                    branch = args[0];
                } else {
                    this.info('Esta demonstração somente suportea o switch --no-ff..');
                }
            }
            var result = this.historyView.merge(branch, noFF);

            if (result === 'Fast-Forward') {
                this.info('Você executou uma mesclagem de avanço rápido.');
            }
        },

        rebase: function (args) {
            var ref = args.shift(),
                result = this.historyView.rebase(ref);

            if (result === 'Fast-Forward') {
                this.info('Fast-forwarded to ' + ref + '.');
            }
        },

        fetch: function () {
            if (!this.originView) {
                throw new Error('Não há servidor remoto de onde buscar.');
            }

            var origin = this.originView,
                local = this.historyView,
                remotePattern = /^origin\/([^\/]+)$/,
                rtb, isRTB, fb,
                fetchBranches = {},
                fetchIds = [], // apenas para ter certeza de não buscar o mesmo commit duas vezes
                fetchCommits = [], fetchCommit,
                resultMessage = '';

            // determinar qual branches buscar
            for (rtb = 0; rtb < local.branches.length; rtb++) {
                isRTB = remotePattern.exec(local.branches[rtb]);
                if (isRTB) {
                    fetchBranches[isRTB[1]] = 0;
                }
            }

            // determinar quais commits faltam no repositório local em relação à origem
            for (fb in fetchBranches) {
                if (origin.branches.indexOf(fb) > -1) {
                    fetchCommit = origin.getCommit(fb);

                    var notInLocal = local.getCommit(fetchCommit.id) === null;
                    while (notInLocal) {
                        if (fetchIds.indexOf(fetchCommit.id) === -1) {
                            fetchCommits.unshift(fetchCommit);
                            fetchIds.unshift(fetchCommit.id);
                        }
                        fetchBranches[fb] += 1;
                        fetchCommit = origin.getCommit(fetchCommit.parent);
                        notInLocal = local.getCommit(fetchCommit.id) === null;
                    }
                }
            }

            // adicionar os commites buscados para os dados do commit local
            for (var fc = 0; fc < fetchCommits.length; fc++) {
                fetchCommit = fetchCommits[fc];
                local.commitData.push({
                    id: fetchCommit.id,
                    parent: fetchCommit.parent,
                    tags: []
                });
            }

            // atualizar os locais de tag das branches de rastreamento remoto
            for (fb in fetchBranches) {
                if (origin.branches.indexOf(fb) > -1) {
                    var remoteLoc = origin.getCommit(fb).id;
                    local.moveTag('origin/' + fb, remoteLoc);
                }

                resultMessage += 'Buscados ' + fetchBranches[fb] + ' commits em ' + fb + '.</br>';
            }

            this.info(resultMessage);

            local.renderCommits();
        },

        pull: function (args) {
            var control = this,
                local = this.historyView,
                currentBranch = local.currentBranch,
                rtBranch = 'origin/' + currentBranch,
                isFastForward = false;

            this.fetch();

            if (!currentBranch) {
                throw new Error('Atualmente você não está em um branch.');
            }

            if (local.branches.indexOf(rtBranch) === -1) {
                throw new Error('O branch atual não foi configurado para fazer pull.');
            }

            setTimeout(function () {
                try {
                    if (args[0] === '--rebase' || control.rebaseConfig[currentBranch] === 'true') {
                        isFastForward = local.rebase(rtBranch) === 'Fast-Forward';
                    } else {
                        isFastForward = local.merge(rtBranch) === 'Fast-Forward';
                    }
                } catch (error) {
                    control.error(error.message);
                }

                if (isFastForward) {
                    control.info('Fast-forwarded to ' + rtBranch + '.');
                }
            }, 750);
        },

        push: function (args) {
            var control = this,
                local = this.historyView,
                remoteName = args.shift() || 'origin',
                remote = this[remoteName + 'View'],
                branchArgs = args.pop(),
                localRef = local.currentBranch,
                remoteRef = local.currentBranch,
                localCommit, remoteCommit,
                findCommitsToPush,
                isCommonCommit,
                toPush = [];

            if (remoteName === 'history') {
                throw new Error('Desculpe, você não pode ter um repositório remoto chamado "history" neste exemplo.');
            }

            if (!remote) {
                throw new Error('Não há um servidor remoto chamado "' + remoteName + '".');
            }

            if (branchArgs) {
                branchArgs = /^([^:]*)(:?)(.*)$/.exec(branchArgs);

                branchArgs[1] && (localRef = branchArgs[1]);
                branchArgs[2] === ':' && (remoteRef = branchArgs[3]);
            }

            if (local.branches.indexOf(localRef) === -1) {
                throw new Error('Local ref: ' + localRef + ' não existe.');
            }

            if (!remoteRef) {
                throw new Error('Nenhum branch remoto foi especificado para fazer push');
            }

            localCommit = local.getCommit(localRef);
            remoteCommit = remote.getCommit(remoteRef);

            findCommitsToPush = function findCommitsToPush(localCommit) {
                var commitToPush,
                    isCommonCommit = remote.getCommit(localCommit.id) !== null;

                while (!isCommonCommit) {
                    commitToPush = {
                        id: localCommit.id,
                        parent: localCommit.parent,
                        tags: []
                    };

                    if (typeof localCommit.parent2 === 'string') {
                        commitToPush.parent2 = localCommit.parent2;
                        findCommitsToPush(local.getCommit(localCommit.parent2));
                    }

                    toPush.unshift(commitToPush);
                    localCommit = local.getCommit(localCommit.parent);
                    isCommonCommit = remote.getCommit(localCommit.id) !== null;
                }
            };

            // push to an existing branch on the remote
            if (remoteCommit && remote.branches.indexOf(remoteRef) > -1) {
                if (!local.isAncestor(remoteCommit.id, localCommit.id)) {
                    throw new Error('Push rejeitado. Não é avanço rápido.');
                }

                isCommonCommit = localCommit.id === remoteCommit.id;

                if (isCommonCommit) {
                    return this.info('Está tudo atualizado.');
                }

                findCommitsToPush(localCommit);

                remote.commitData = remote.commitData.concat(toPush);
                remote.moveTag(remoteRef, toPush[toPush.length - 1].id);
                remote.renderCommits();
            } else {
                this.info('Desculpe, a criação de novos branches remotos ainda não é suportada.');
            }
        },

        config: function (args) {
            var path = args.shift().split('.');

            if (path[0] === 'branch') {
                if (path[2] === 'rebase') {
                    this.rebase[path[1]] = args.pop();
                }
            }
        }
    };

    return ControlBox;
});
