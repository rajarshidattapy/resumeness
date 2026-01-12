document.addEventListener('DOMContentLoaded', () => {
    const btnGenerate = document.getElementById('btn-generate');
    const btnSync = document.getElementById('btn-sync');
    const btnChat = document.getElementById('btn-chat');

    btnGenerate.addEventListener('click', async (e) => {
        e.preventDefault();
            const jd = document.getElementById('jd').value;
            const overleaf_link = document.getElementById('overleaf_link').value;
        const target_file = document.getElementById('target_file').value || 'resume.tex';
            if (!overleaf_link.trim()) return alert('Please provide an Overleaf project link (required)');
            if (!jd.trim()) return alert('Please paste a job description');

        document.getElementById('latex_output').value = 'Generating...';

        try {
            const res = await fetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jd, overleaf_link, target_file })
            });
            const data = await res.json();
            if (data.error) {
                document.getElementById('latex_output').value = 'Error: ' + data.error;
            } else {
                document.getElementById('latex_output').value = data.latex || '';
            }
        } catch (err) {
            document.getElementById('latex_output').value = 'Network error';
            console.error(err);
        }
    });

    btnSync.addEventListener('click', async (e) => {
        e.preventDefault();
        const overleaf_link = document.getElementById('overleaf_link').value;
        const jd = document.getElementById('jd').value;
        const target_file = document.getElementById('target_file').value || 'resume.tex';
            if (!overleaf_link.trim()) return alert('Please provide an Overleaf project link (required)');
        // send to update_overleaf which will attempt to sync if server supports it
        document.getElementById('latex_output').value = 'Syncing...';
        try {
            const res = await fetch('/update_overleaf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jd, overleaf_link, file: target_file })
            });
            const data = await res.json();
            if (data.error) {
                document.getElementById('latex_output').value = 'Error: ' + data.error;
            } else if (data.synced) {
                document.getElementById('latex_output').value = 'Synced successfully';
            } else {
                document.getElementById('latex_output').value = data.latex || '';
            }
        } catch (err) {
            document.getElementById('latex_output').value = 'Network error';
        }
    });

    btnChat.addEventListener('click', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('chat_msg').value;
        const latex = document.getElementById('latex_output').value;
        if (!msg.trim()) return;
        document.getElementById('chat_response').textContent = 'Thinking...';
        try {
            const res = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ msg, latex })
            });
            const data = await res.json();
            if (data.error) document.getElementById('chat_response').textContent = 'Error: ' + data.error;
            else document.getElementById('chat_response').textContent = data.suggestion || JSON.stringify(data, null, 2);
        } catch (err) {
            document.getElementById('chat_response').textContent = 'Network error';
        }
    });
});
