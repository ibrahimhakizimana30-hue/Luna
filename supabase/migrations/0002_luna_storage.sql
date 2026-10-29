-- Luna : stockage privé des pièces d'identité (KYC)
-- Chaque utilisateur ne peut déposer et relire que les fichiers de son dossier
-- « <son id>/… ». Personne d'autre (sauf l'administrateur) ne peut les lire.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kyc', 'kyc', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "KYC : déposer ses fichiers" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "KYC : lire ses fichiers" on storage.objects
  for select to authenticated
  using (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);
